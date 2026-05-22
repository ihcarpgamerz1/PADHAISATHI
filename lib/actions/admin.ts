"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { ADMIN_EMAIL, CLASS_LEVELS, LEADERBOARD } from "@/lib/constants"
import { getNepaliDateString, getNepaliNow } from "@/lib/utils"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const UserIdSchema = z.object({ userId: z.string().uuid() })

const UpdateUserSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2).max(100).trim().optional(),
  classLevel: z.number().int().refine((v) => [8, 9, 10].includes(v)).optional(),
  role: z.enum(["student", "teacher", "admin"]).optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().max(500).optional(),
})

const CreateSubjectSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  classLevel: z.number().int().refine((v) => [8, 9, 10].includes(v)),
  color: z.string().regex(/^[a-z]+$/, "Color must be a lowercase string").optional().default("blue"),
  icon: z.string().max(50).optional().default("book"),
  orderIndex: z.number().int().min(0).optional().default(0),
})

const BulkFlashcardSchema = z.object({
  chapterId: z.string().uuid(),
  flashcards: z
    .array(
      z.object({
        question: z.string().min(5).max(1000).trim(),
        answer: z.string().min(1).max(2000).trim(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        hint: z.string().max(500).optional().default(""),
      })
    )
    .min(1)
    .max(100),
})

const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

const UserSearchSchema = z.object({
  query: z.string().max(200).trim().optional().default(""),
  role: z.enum(["student", "teacher", "admin", "all"]).optional().default("all"),
  classLevel: z.number().int().optional(),
  isBanned: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminUser = {
  id: string
  full_name: string
  email: string
  class_level: number
  role: "student" | "teacher" | "admin"
  xp: number
  streak_count: number
  is_banned: boolean
  ban_reason: string | null
  avatar_url: string | null
  created_at: string
  last_sign_in_at: string | null
}

export type PlatformStats = {
  users: {
    total: number
    students: number
    teachers: number
    admins: number
    bannedCount: number
    newToday: number
    newThisWeek: number
    activeToday: number
  }
  content: {
    subjects: number
    chapters: number
    flashcards: number
    notes: number
    bookmarks: number
  }
  activity: {
    quizSessionsTotal: number
    quizSessionsToday: number
    flashcardReviewsTotal: number
    flashcardReviewsToday: number
    aiSessionsTotal: number
    aiSessionsToday: number
    totalXpAwarded: number
  }
  topSubjects: Array<{ subjectName: string; classLevel: number; quizCount: number }>
  classBreakdown: Array<{ classLevel: number; studentCount: number }>
}

export type ContentReport = {
  id: string
  reporter_id: string
  content_type: "flashcard" | "note" | "chapter"
  content_id: string
  reason: string
  status: "pending" | "resolved" | "dismissed"
  created_at: string
  reporter: { full_name: string; email: string }
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Guard: admin-only ────────────────────────────────────────────────────────

async function requireAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, error: "You must be signed in" }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, role, email")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return { user: null, error: "User profile not found" }
  }

  if (profile.role !== "admin") {
    return { user: null, error: "Admin access required" }
  }

  return { user: { id: user.id, email: user.email ?? profile.email, role: profile.role }, error: null }
}

// ─── Platform statistics ──────────────────────────────────────────────────────

/**
 * Returns a comprehensive snapshot of platform-wide stats.
 * Displayed on the admin dashboard home.
 */
export async function getPlatformStats(): Promise<ActionResult<PlatformStats>> {
  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  const todayStart = getNepaliNow()
  todayStart.setUTCHours(0, 0, 0, 0)
  // Adjust back to UTC: Nepal midnight is 18:15 UTC previous day
  const todayStartUTC = new Date(todayStart.getTime() - 345 * 60 * 1000).toISOString()

  const weekStartUTC = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Run all queries in parallel
  const [
    usersResult,
    subjectsResult,
    chaptersResult,
    flashcardsResult,
    notesResult,
    bookmarksResult,
    quizTotalResult,
    quizTodayResult,
    reviewTotalResult,
    reviewTodayResult,
    aiTotalResult,
    aiTodayResult,
    newTodayResult,
    newWeekResult,
    topSubjectsResult,
  ] = await Promise.all([
    supabase.from("users").select("id, role, is_banned, xp, created_at"),
    supabase.from("subjects").select("id", { count: "exact", head: true }),
    supabase.from("chapters").select("id", { count: "exact", head: true }),
    supabase.from("flashcards").select("id", { count: "exact", head: true }),
    supabase.from("notes").select("id", { count: "exact", head: true }),
    supabase.from("bookmarks").select("id", { count: "exact", head: true }),
    supabase.from("quiz_sessions").select("id", { count: "exact", head: true }),
    supabase
      .from("quiz_sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStartUTC),
    supabase.from("flashcard_reviews").select("id", { count: "exact", head: true }),
    supabase
      .from("flashcard_reviews")
      .select("id", { count: "exact", head: true })
      .gte("reviewed_at", todayStartUTC),
    supabase.from("ai_sessions").select("id", { count: "exact", head: true }),
    supabase
      .from("ai_sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStartUTC),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStartUTC),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStartUTC),
    supabase
      .from("quiz_sessions")
      .select(
        `
        chapter:chapters (
          subject:subjects (
            name,
            class_level
          )
        )
      `
      )
      .not("completed_at", "is", null)
      .limit(500),
  ])

  const allUsers = usersResult.data ?? []
  const totalUsers = allUsers.length
  const students = allUsers.filter((u) => u.role === "student").length
  const teachers = allUsers.filter((u) => u.role === "teacher").length
  const admins = allUsers.filter((u) => u.role === "admin").length
  const bannedCount = allUsers.filter((u) => u.is_banned).length
  const totalXpAwarded = allUsers.reduce((sum, u) => sum + (u.xp ?? 0), 0)

  // Count active today: users who have quiz sessions or flashcard reviews today
  // Approximated from quiz sessions today as a proxy
  const activeToday = quizTodayResult.count ?? 0

  // Build top subjects from quiz sessions
  const subjectQuizCounts: Record<string, { name: string; classLevel: number; count: number }> = {}
  for (const session of topSubjectsResult.data ?? []) {
    const chapter = Array.isArray(session.chapter) ? session.chapter[0] : session.chapter
    const subject = chapter?.subject
      ? Array.isArray(chapter.subject) ? chapter.subject[0] : chapter.subject
      : null
    if (!subject?.name) continue
    const key = `${subject.name}-${subject.class_level}`
    if (!subjectQuizCounts[key]) {
      subjectQuizCounts[key] = { name: subject.name, classLevel: subject.class_level, count: 0 }
    }
    subjectQuizCounts[key].count++
  }

  const topSubjects = Object.values(subjectQuizCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((s) => ({
      subjectName: s.name,
      classLevel: s.classLevel,
      quizCount: s.count,
    }))

  // Class breakdown
  const classBreakdown = CLASS_LEVELS.map((level) => ({
    classLevel: level,
    studentCount: allUsers.filter((u) => u.role === "student").length, // approximate — would need class_level field
  }))

  // More accurate class breakdown from users table
  const classBreakdownAccurate: PlatformStats["classBreakdown"] = []
  const { data: classData } = await supabase
    .from("users")
    .select("class_level")
    .eq("role", "student")

  for (const level of CLASS_LEVELS) {
    classBreakdownAccurate.push({
      classLevel: level,
      studentCount: (classData ?? []).filter((u) => u.class_level === level).length,
    })
  }

  return {
    success: true,
    data: {
      users: {
        total: totalUsers,
        students,
        teachers,
        admins,
        bannedCount,
        newToday: newTodayResult.count ?? 0,
        newThisWeek: newWeekResult.count ?? 0,
        activeToday,
      },
      content: {
        subjects: subjectsResult.count ?? 0,
        chapters: chaptersResult.count ?? 0,
        flashcards: flashcardsResult.count ?? 0,
        notes: notesResult.count ?? 0,
        bookmarks: bookmarksResult.count ?? 0,
      },
      activity: {
        quizSessionsTotal: quizTotalResult.count ?? 0,
        quizSessionsToday: quizTodayResult.count ?? 0,
        flashcardReviewsTotal: reviewTotalResult.count ?? 0,
        flashcardReviewsToday: reviewTodayResult.count ?? 0,
        aiSessionsTotal: aiTotalResult.count ?? 0,
        aiSessionsToday: aiTodayResult.count ?? 0,
        totalXpAwarded,
      },
      topSubjects,
      classBreakdown: classBreakdownAccurate,
    },
  }
}

// ─── User management ──────────────────────────────────────────────────────────

/**
 * Returns a paginated, filterable list of all users on the platform.
 */
export async function getUsers(
  input: z.infer<typeof UserSearchSchema>
): Promise<ActionResult<{ users: AdminUser[]; total: number }>> {
  const parsed = UserSearchSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  const { query, role, classLevel, isBanned, page, pageSize } = parsed.data
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      class_level,
      role,
      xp,
      streak_count,
      is_banned,
      ban_reason,
      avatar_url,
      created_at
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (query) {
    q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
  }
  if (role && role !== "all") {
    q = q.eq("role", role)
  }
  if (classLevel !== undefined) {
    q = q.eq("class_level", classLevel)
  }
  if (isBanned !== undefined) {
    q = q.eq("is_banned", isBanned)
  }

  const { data, error, count } = await q

  if (error) {
    console.error("[getUsers] Supabase error:", error)
    return { success: false, error: "Failed to load users" }
  }

  return {
    success: true,
    data: {
      users: (data ?? []) as AdminUser[],
      total: count ?? 0,
    },
  }
}

/**
 * Returns a single user's full profile.
 */
export async function getUserById(userId: string): Promise<ActionResult<AdminUser>> {
  const parsed = UserIdSchema.safeParse({ userId })
  if (!parsed.success) return { success: false, error: "Invalid user ID" }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  const { data, error } = await supabase
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      class_level,
      role,
      xp,
      streak_count,
      is_banned,
      ban_reason,
      avatar_url,
      created_at
    `
    )
    .eq("id", userId)
    .single()

  if (error || !data) {
    return { success: false, error: "User not found" }
  }

  return { success: true, data: data as AdminUser }
}

/**
 * Updates user profile fields, role, or ban status.
 * Cannot demote or modify the root admin account.
 */
export async function updateUser(
  input: z.infer<typeof UpdateUserSchema>
): Promise<ActionResult<AdminUser>> {
  const parsed = UpdateUserSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerSupabaseClient()
  const { user: adminUser, error: authError } = await requireAdmin(supabase)
  if (!adminUser) return { success: false, error: authError! }

  // Protect root admin account
  const { data: target } = await supabase
    .from("users")
    .select("email, role")
    .eq("id", parsed.data.userId)
    .single()

  if (!target) return { success: false, error: "User not found" }

  if (target.email === ADMIN_EMAIL && adminUser.email !== ADMIN_EMAIL) {
    return { success: false, error: "The root admin account cannot be modified" }
  }

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (parsed.data.fullName !== undefined) updatePayload.full_name = parsed.data.fullName
  if (parsed.data.classLevel !== undefined) updatePayload.class_level = parsed.data.classLevel
  if (parsed.data.role !== undefined) updatePayload.role = parsed.data.role
  if (parsed.data.isBanned !== undefined) {
    updatePayload.is_banned = parsed.data.isBanned
    updatePayload.ban_reason = parsed.data.isBanned ? (parsed.data.banReason ?? null) : null
  }

  const { data, error } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", parsed.data.userId)
    .select(
      `id, full_name, email, class_level, role, xp, streak_count, is_banned, ban_reason, avatar_url, created_at`
    )
    .single()

  if (error) {
    console.error("[updateUser] Supabase error:", error)
    return { success: false, error: "Failed to update user" }
  }

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${parsed.data.userId}`)
  return { success: true, data: data as AdminUser }
}

/**
 * Bans a user — sets is_banned=true and records a reason.
 * Banned users are blocked in middleware on next request.
 */
export async function banUser(
  userId: string,
  reason: string
): Promise<ActionResult> {
  if (!reason.trim()) {
    return { success: false, error: "A ban reason is required" }
  }

  return updateUser({
    userId,
    isBanned: true,
    banReason: reason.trim(),
  })
}

/**
 * Lifts a ban from a user.
 */
export async function unbanUser(userId: string): Promise<ActionResult> {
  return updateUser({ userId, isBanned: false })
}

/**
 * Permanently deletes a user account and all associated data.
 * This is irreversible. Cannot delete the root admin.
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  const parsed = UserIdSchema.safeParse({ userId })
  if (!parsed.success) return { success: false, error: "Invalid user ID" }

  const supabase = await createServerSupabaseClient()
  const { user: adminUser, error: authError } = await requireAdmin(supabase)
  if (!adminUser) return { success: false, error: authError! }

  const { data: target } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single()

  if (!target) return { success: false, error: "User not found" }
  if (target.email === ADMIN_EMAIL) {
    return { success: false, error: "The root admin account cannot be deleted" }
  }

  // Supabase cascades deletes via FK if schema is set up with ON DELETE CASCADE.
  // Additionally call auth.admin to remove the auth record.
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

  if (authDeleteError) {
    console.error("[deleteUser] Auth delete error:", authDeleteError)
    return { success: false, error: "Failed to delete user authentication record" }
  }

  // The users table row is deleted via cascade from auth.users → users FK.
  revalidatePath("/admin/users")
  return { success: true, data: undefined }
}

// ─── Content management ───────────────────────────────────────────────────────

/**
 * Adds a new subject to the platform.
 * Only admins can add subjects directly (teachers use flashcard generation).
 */
export async function createSubject(
  input: z.infer<typeof CreateSubjectSchema>
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = CreateSubjectSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name: parsed.data.name,
      class_level: parsed.data.classLevel,
      color: parsed.data.color,
      icon: parsed.data.icon,
      order_index: parsed.data.orderIndex,
      is_active: true,
    })
    .select("id, name")
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A subject with this name already exists for this class level" }
    }
    console.error("[createSubject] Supabase error:", error)
    return { success: false, error: "Failed to create subject" }
  }

  revalidatePath("/admin/content")
  revalidatePath("/subjects")
  return { success: true, data }
}

/**
 * Bulk-imports flashcards into a chapter.
 * Used by admins to seed content quickly.
 */
export async function bulkCreateFlashcards(
  input: z.infer<typeof BulkFlashcardSchema>
): Promise<ActionResult<{ created: number; skipped: number }>> {
  const parsed = BulkFlashcardSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  // Verify chapter exists
  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, name")
    .eq("id", parsed.data.chapterId)
    .single()

  if (!chapter) {
    return { success: false, error: "Chapter not found" }
  }

  // Fetch existing questions for this chapter to deduplicate
  const { data: existing } = await supabase
    .from("flashcards")
    .select("question")
    .eq("chapter_id", parsed.data.chapterId)

  const existingQuestions = new Set(
    (existing ?? []).map((f) => f.question.toLowerCase().trim())
  )

  const toInsert = parsed.data.flashcards.filter(
    (f) => !existingQuestions.has(f.question.toLowerCase().trim())
  )

  const skipped = parsed.data.flashcards.length - toInsert.length

  if (toInsert.length === 0) {
    return {
      success: true,
      data: { created: 0, skipped },
    }
  }

  const { error } = await supabase.from("flashcards").insert(
    toInsert.map((f) => ({
      chapter_id: parsed.data.chapterId,
      question: f.question,
      answer: f.answer,
      difficulty: f.difficulty,
      hint: f.hint,
      is_active: true,
      created_by: user.id,
    }))
  )

  if (error) {
    console.error("[bulkCreateFlashcards] Supabase error:", error)
    return { success: false, error: "Failed to import flashcards" }
  }

  revalidatePath(`/chapters/${parsed.data.chapterId}`)
  revalidatePath("/admin/content")

  return { success: true, data: { created: toInsert.length, skipped } }
}

/**
 * Toggles the is_active flag on any flashcard.
 * Inactive flashcards are hidden from students but not deleted.
 */
export async function toggleFlashcardActive(
  flashcardId: string
): Promise<ActionResult<{ isActive: boolean }>> {
  if (!flashcardId) return { success: false, error: "Flashcard ID is required" }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  const { data: current } = await supabase
    .from("flashcards")
    .select("id, is_active")
    .eq("id", flashcardId)
    .single()

  if (!current) return { success: false, error: "Flashcard not found" }

  const { data, error } = await supabase
    .from("flashcards")
    .update({ is_active: !current.is_active })
    .eq("id", flashcardId)
    .select("is_active")
    .single()

  if (error) {
    console.error("[toggleFlashcardActive] Supabase error:", error)
    return { success: false, error: "Failed to update flashcard" }
  }

  revalidatePath("/admin/content")
  return { success: true, data: { isActive: data.is_active } }
}

/**
 * Hard-deletes a flashcard. Irreversible.
 * Also removes all review records for this flashcard.
 */
export async function deleteFlashcard(flashcardId: string): Promise<ActionResult> {
  if (!flashcardId) return { success: false, error: "Flashcard ID is required" }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  // Remove review records first (FK)
  await supabase.from("flashcard_reviews").delete().eq("flashcard_id", flashcardId)

  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", flashcardId)

  if (error) {
    console.error("[deleteFlashcard] Supabase error:", error)
    return { success: false, error: "Failed to delete flashcard" }
  }

  revalidatePath("/admin/content")
  return { success: true, data: undefined }
}

// ─── Leaderboard management ───────────────────────────────────────────────────

/**
 * Forces a leaderboard recompute for a given period.
 * Normally runs on a cron, but admins can trigger it manually.
 */
export async function recomputeLeaderboard(
  period: "weekly" | "monthly" | "all_time"
): Promise<ActionResult<{ updated: number }>> {
  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  // Fetch all users sorted by XP
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, xp")
    .eq("is_banned", false)
    .order("xp", { ascending: false })

  if (usersError || !users) {
    console.error("[recomputeLeaderboard] Error fetching users:", usersError)
    return { success: false, error: "Failed to fetch users for leaderboard" }
  }

  if (users.length === 0) {
    return { success: true, data: { updated: 0 } }
  }

  // Build upsert rows
  const rows = users.map((u, index) => ({
    user_id: u.id,
    period,
    xp: u.xp,
    rank: index + 1,
    computed_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await supabase
    .from("leaderboard")
    .upsert(rows, { onConflict: "user_id,period" })

  if (upsertError) {
    console.error("[recomputeLeaderboard] Upsert error:", upsertError)
    return { success: false, error: "Failed to update leaderboard" }
  }

  revalidatePath("/leaderboard")
  revalidatePath("/admin/leaderboard")

  return { success: true, data: { updated: rows.length } }
}

// ─── XP management ────────────────────────────────────────────────────────────

/**
 * Manually grants or deducts XP from a user.
 * Negative amount deducts. XP floor is 0.
 */
export async function adjustUserXP(
  userId: string,
  amount: number,
  reason: string
): Promise<ActionResult<{ newXP: number }>> {
  const parsed = UserIdSchema.safeParse({ userId })
  if (!parsed.success) return { success: false, error: "Invalid user ID" }
  if (amount === 0) return { success: false, error: "Amount cannot be zero" }
  if (!reason.trim()) return { success: false, error: "Reason is required" }

  const supabase = await createServerSupabaseClient()
  const { user: adminUser, error: authError } = await requireAdmin(supabase)
  if (!adminUser) return { success: false, error: authError! }

  const { data: current } = await supabase
    .from("users")
    .select("id, xp")
    .eq("id", userId)
    .single()

  if (!current) return { success: false, error: "User not found" }

  const newXP = Math.max(0, current.xp + amount)

  const { error } = await supabase
    .from("users")
    .update({ xp: newXP, updated_at: new Date().toISOString() })
    .eq("id", userId)

  if (error) {
    console.error("[adjustUserXP] Supabase error:", error)
    return { success: false, error: "Failed to adjust XP" }
  }

  // Log admin action
  await supabase.from("admin_logs").insert({
    admin_id: adminUser.id,
    action: "xp_adjustment",
    target_user_id: userId,
    metadata: { amount, reason, previous_xp: current.xp, new_xp: newXP },
  })

  revalidatePath(`/admin/users/${userId}`)
  return { success: true, data: { newXP } }
}

// ─── Admin activity log ───────────────────────────────────────────────────────

/**
 * Returns the most recent admin actions across all admins.
 * Used on the admin audit log page.
 */
export async function getAdminLogs(
  page = 1,
  pageSize = 50
): Promise<
  ActionResult<
    Array<{
      id: string
      action: string
      adminName: string
      targetUserId: string | null
      metadata: Record<string, unknown>
      createdAt: string
    }>
  >
> {
  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error } = await supabase
    .from("admin_logs")
    .select(
      `
      id,
      action,
      target_user_id,
      metadata,
      created_at,
      admin:users!admin_id (
        full_name
      )
    `
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("[getAdminLogs] Supabase error:", error)
    return { success: false, error: "Failed to load admin logs" }
  }

  const logs = (data ?? []).map((row) => {
    const admin = Array.isArray(row.admin) ? row.admin[0] : row.admin
    return {
      id: row.id,
      action: row.action,
      adminName: admin?.full_name ?? "Unknown admin",
      targetUserId: row.target_user_id ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at,
    }
  })

  return { success: true, data: logs }
}

// ─── AI usage overview (admin view) ──────────────────────────────────────────

/**
 * Returns platform-wide AI usage breakdown by provider and session type.
 * Used on the admin AI usage dashboard.
 */
export async function getAIUsageOverview(
  days = 7
): Promise<
  ActionResult<{
    totalRequests: number
    totalTokens: number
    successRate: number
    byProvider: Record<string, { requests: number; tokens: number; avgDurationMs: number }>
    byType: Record<string, { requests: number; tokens: number }>
    dailyTrend: Array<{ date: string; requests: number; tokens: number }>
  }>
> {
  if (days < 1 || days > 90) {
    return { success: false, error: "Days must be between 1 and 90" }
  }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireAdmin(supabase)
  if (!user) return { success: false, error: authError! }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("ai_sessions")
    .select(
      "provider, session_type, prompt_tokens, completion_tokens, total_tokens, duration_ms, success, created_at"
    )
    .gte("created_at", since)

  if (error) {
    console.error("[getAIUsageOverview] Supabase error:", error)
    return { success: false, error: "Failed to load AI usage data" }
  }

  const sessions = data ?? []
  const totalRequests = sessions.length
  const totalTokens = sessions.reduce((sum, s) => sum + (s.total_tokens ?? 0), 0)
  const successCount = sessions.filter((s) => s.success).length
  const successRate = totalRequests > 0 ? successCount / totalRequests : 0

  // By provider
  const byProvider: Record<string, { requests: number; tokens: number; avgDurationMs: number; totalDuration: number }> = {}
  for (const s of sessions) {
    if (!s.provider) continue
    if (!byProvider[s.provider]) {
      byProvider[s.provider] = { requests: 0, tokens: 0, avgDurationMs: 0, totalDuration: 0 }
    }
    byProvider[s.provider].requests++
    byProvider[s.provider].tokens += s.total_tokens ?? 0
    byProvider[s.provider].totalDuration += s.duration_ms ?? 0
  }
  const byProviderFinal: Record<string, { requests: number; tokens: number; avgDurationMs: number }> = {}
  for (const [provider, stats] of Object.entries(byProvider)) {
    byProviderFinal[provider] = {
      requests: stats.requests,
      tokens: stats.tokens,
      avgDurationMs: stats.requests > 0 ? Math.round(stats.totalDuration / stats.requests) : 0,
    }
  }

  // By session type
  const byType: Record<string, { requests: number; tokens: number }> = {}
  for (const s of sessions) {
    if (!s.session_type) continue
    if (!byType[s.session_type]) byType[s.session_type] = { requests: 0, tokens: 0 }
    byType[s.session_type].requests++
    byType[s.session_type].tokens += s.total_tokens ?? 0
  }

  // Daily trend — group by Nepal date
  const dailyMap: Record<string, { requests: number; tokens: number }> = {}
  for (const s of sessions) {
    const date = getNepaliDateString(new Date(new Date(s.created_at).getTime() + 345 * 60 * 1000))
    if (!dailyMap[date]) dailyMap[date] = { requests: 0, tokens: 0 }
    dailyMap[date].requests++
    dailyMap[date].tokens += s.total_tokens ?? 0
  }

  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }))

  return {
    success: true,
    data: {
      totalRequests,
      totalTokens,
      successRate: Math.round(successRate * 100) / 100,
      byProvider: byProviderFinal,
      byType,
      dailyTrend,
    },
  }
}