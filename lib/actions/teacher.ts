"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { TEACHER } from "@/lib/constants"
import { generateJoinCode, getErrorMessage } from "@/lib/utils"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateClassSchema = z.object({
  name: z
    .string()
    .min(2, "Class name must be at least 2 characters")
    .max(80, "Class name cannot exceed 80 characters")
    .trim(),
  classLevel: z.number().int().refine((v) => [8, 9, 10].includes(v), {
    message: "Class level must be 8, 9, or 10",
  }),
  description: z.string().max(500).optional().default(""),
})

const UpdateClassSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(2).max(80).trim().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
})

const ClassIdSchema = z.object({ classId: z.string().uuid() })
const StudentIdSchema = z.object({ studentId: z.string().uuid() })

const JoinClassSchema = z.object({
  joinCode: z
    .string()
    .min(6, "Join code must be 6 characters")
    .max(6, "Join code must be 6 characters")
    .toUpperCase(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type TeacherClass = {
  id: string
  teacher_id: string
  name: string
  class_level: number
  description: string
  join_code: string
  is_active: boolean
  student_count: number
  created_at: string
  updated_at: string
}

export type ClassStudent = {
  id: string
  class_id: string
  student_id: string
  joined_at: string
  student: {
    id: string
    full_name: string
    email: string
    class_level: number
    xp: number
    streak_count: number
    avatar_url: string | null
  }
}

export type StudentProgress = {
  studentId: string
  studentName: string
  xp: number
  streak: number
  quizzesTaken: number
  flashcardsReviewed: number
  notesCreated: number
  avgQuizScore: number
  lastActiveAt: string | null
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Guard: teacher-only ──────────────────────────────────────────────────────

async function requireTeacher(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, error: "You must be signed in" }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return { user: null, error: "User profile not found" }
  }

  if (profile.role !== "teacher" && profile.role !== "admin") {
    return { user: null, error: "You must be a teacher to perform this action" }
  }

  return { user: { id: user.id, ...profile }, error: null }
}

// ─── Class management ─────────────────────────────────────────────────────────

/**
 * Creates a new teacher class with a unique join code.
 */
export async function createClass(
  input: z.infer<typeof CreateClassSchema>
): Promise<ActionResult<TeacherClass>> {
  const parsed = CreateClassSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireTeacher(supabase)
  if (!user) return { success: false, error: authError! }

  // Check class limit
  const { count } = await supabase
    .from("teacher_classes")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", user.id)
    .eq("is_active", true)

  if ((count ?? 0) >= TEACHER.MAX_CLASSES) {
    return {
      success: false,
      error: `You can have a maximum of ${TEACHER.MAX_CLASSES} active classes`,
    }
  }

  // Generate a unique join code (retry on collision, max 5 attempts)
  let joinCode = ""
  let attempts = 0
  while (attempts < 5) {
    const candidate = generateJoinCode(TEACHER.JOIN_CODE_LENGTH)
    const { data: existing } = await supabase
      .from("teacher_classes")
      .select("id")
      .eq("join_code", candidate)
      .maybeSingle()

    if (!existing) {
      joinCode = candidate
      break
    }
    attempts++
  }

  if (!joinCode) {
    return { success: false, error: "Failed to generate a unique join code. Please try again." }
  }

  const { data, error } = await supabase
    .from("teacher_classes")
    .insert({
      teacher_id: user.id,
      name: parsed.data.name,
      class_level: parsed.data.classLevel,
      description: parsed.data.description,
      join_code: joinCode,
      is_active: true,
    })
    .select("*")
    .single()

  if (error) {
    console.error("[createClass] Supabase error:", error)
    return { success: false, error: "Failed to create class. Please try again." }
  }

  revalidatePath("/teacher")
  return { success: true, data: { ...data, student_count: 0 } as TeacherClass }
}

/**
 * Returns all classes belonging to the current teacher, with student counts.
 */
export async function getTeacherClasses(): Promise<ActionResult<TeacherClass[]>> {
  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireTeacher(supabase)
  if (!user) return { success: false, error: authError! }

  const { data, error } = await supabase
    .from("teacher_classes")
    .select(
      `
      id,
      teacher_id,
      name,
      class_level,
      description,
      join_code,
      is_active,
      created_at,
      updated_at,
      student_count:class_students(count)
    `
    )
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getTeacherClasses] Supabase error:", error)
    return { success: false, error: "Failed to load your classes" }
  }

  const classes = (data ?? []).map((c) => ({
    ...c,
    student_count: Array.isArray(c.student_count)
      ? (c.student_count[0] as { count: number })?.count ?? 0
      : 0,
  }))

  return { success: true, data: classes as TeacherClass[] }
}

/**
 * Updates a class name, description, or active status.
 */
export async function updateClass(
  input: z.infer<typeof UpdateClassSchema>
): Promise<ActionResult<TeacherClass>> {
  const parsed = UpdateClassSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireTeacher(supabase)
  if (!user) return { success: false, error: authError! }

  // Verify ownership
  const { data: existing } = await supabase
    .from("teacher_classes")
    .select("id, teacher_id")
    .eq("id", parsed.data.classId)
    .eq("teacher_id", user.id)
    .single()

  if (!existing) {
    return { success: false, error: "Class not found or you don't have permission to edit it" }
  }

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
  if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description
  if (parsed.data.isActive !== undefined) updatePayload.is_active = parsed.data.isActive

  const { data, error } = await supabase
    .from("teacher_classes")
    .update(updatePayload)
    .eq("id", parsed.data.classId)
    .select("*")
    .single()

  if (error) {
    console.error("[updateClass] Supabase error:", error)
    return { success: false, error: "Failed to update class" }
  }

  revalidatePath("/teacher")
  revalidatePath(`/teacher/classes/${parsed.data.classId}`)
  return { success: true, data: data as TeacherClass }
}

/**
 * Deletes a class and removes all student enrollments.
 * Only the owning teacher can delete their class.
 */
export async function deleteClass(classId: string): Promise<ActionResult> {
  const parsed = ClassIdSchema.safeParse({ classId })
  if (!parsed.success) return { success: false, error: "Invalid class ID" }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireTeacher(supabase)
  if (!user) return { success: false, error: authError! }

  // Verify ownership
  const { data: existing } = await supabase
    .from("teacher_classes")
    .select("id, teacher_id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single()

  if (!existing) {
    return { success: false, error: "Class not found or you don't have permission to delete it" }
  }

  // Delete enrollments first (FK constraint)
  await supabase.from("class_students").delete().eq("class_id", classId)

  const { error } = await supabase
    .from("teacher_classes")
    .delete()
    .eq("id", classId)

  if (error) {
    console.error("[deleteClass] Supabase error:", error)
    return { success: false, error: "Failed to delete class" }
  }

  revalidatePath("/teacher")
  return { success: true, data: undefined }
}

// ─── Student management ───────────────────────────────────────────────────────

/**
 * Returns all students enrolled in a class, with their profiles.
 */
export async function getClassStudents(
  classId: string
): Promise<ActionResult<ClassStudent[]>> {
  const parsed = ClassIdSchema.safeParse({ classId })
  if (!parsed.success) return { success: false, error: "Invalid class ID" }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireTeacher(supabase)
  if (!user) return { success: false, error: authError! }

  // Verify ownership
  const { data: cls } = await supabase
    .from("teacher_classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single()

  if (!cls) {
    return { success: false, error: "Class not found or access denied" }
  }

  const { data, error } = await supabase
    .from("class_students")
    .select(
      `
      id,
      class_id,
      student_id,
      joined_at,
      student:users (
        id,
        full_name,
        email,
        class_level,
        xp,
        streak_count,
        avatar_url
      )
    `
    )
    .eq("class_id", classId)
    .order("joined_at", { ascending: false })

  if (error) {
    console.error("[getClassStudents] Supabase error:", error)
    return { success: false, error: "Failed to load students" }
  }

  return { success: true, data: (data ?? []) as ClassStudent[] }
}

/**
 * Removes a student from a class.
 * Only the teacher who owns the class can remove students.
 */
export async function removeStudentFromClass(
  classId: string,
  studentId: string
): Promise<ActionResult> {
  const classCheck = ClassIdSchema.safeParse({ classId })
  const studentCheck = StudentIdSchema.safeParse({ studentId })

  if (!classCheck.success || !studentCheck.success) {
    return { success: false, error: "Invalid class or student ID" }
  }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireTeacher(supabase)
  if (!user) return { success: false, error: authError! }

  // Verify class ownership
  const { data: cls } = await supabase
    .from("teacher_classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single()

  if (!cls) {
    return { success: false, error: "Class not found or access denied" }
  }

  const { error } = await supabase
    .from("class_students")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId)

  if (error) {
    console.error("[removeStudentFromClass] Supabase error:", error)
    return { success: false, error: "Failed to remove student" }
  }

  revalidatePath(`/teacher/classes/${classId}`)
  return { success: true, data: undefined }
}

// ─── Student: join a class ────────────────────────────────────────────────────

/**
 * Enrolls the current student in a class using its join code.
 * Students call this — not teachers.
 */
export async function joinClass(
  input: z.infer<typeof JoinClassSchema>
): Promise<ActionResult<{ className: string; teacherName: string }>> {
  const parsed = JoinClassSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in to join a class" }
  }

  // Look up class by join code
  const { data: cls, error: classError } = await supabase
    .from("teacher_classes")
    .select(
      `
      id,
      name,
      is_active,
      class_level,
      teacher:users!teacher_id (
        id,
        full_name
      )
    `
    )
    .eq("join_code", parsed.data.joinCode)
    .single()

  if (classError || !cls) {
    return { success: false, error: "Invalid join code. Please check and try again." }
  }

  if (!cls.is_active) {
    return { success: false, error: "This class is no longer active." }
  }

  // Check student isn't already enrolled
  const { data: existing } = await supabase
    .from("class_students")
    .select("id")
    .eq("class_id", cls.id)
    .eq("student_id", user.id)
    .maybeSingle()

  if (existing) {
    return { success: false, error: "You are already enrolled in this class." }
  }

  // Check class isn't at capacity
  const { count } = await supabase
    .from("class_students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", cls.id)

  if ((count ?? 0) >= TEACHER.MAX_STUDENTS_PER_CLASS) {
    return { success: false, error: "This class is full. Please ask your teacher to increase the limit." }
  }

  const { error: joinError } = await supabase.from("class_students").insert({
    class_id: cls.id,
    student_id: user.id,
  })

  if (joinError) {
    console.error("[joinClass] Supabase error:", joinError)
    return { success: false, error: "Failed to join class. Please try again." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/classes")

  const teacher = Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher
  return {
    success: true,
    data: {
      className: cls.name,
      teacherName: teacher?.full_name ?? "Your teacher",
    },
  }
}

/**
 * Returns all classes the current student is enrolled in.
 */
export async function getMyClasses(): Promise<ActionResult<
  Array<{
    id: string
    name: string
    classLevel: number
    teacherName: string
    joinedAt: string
  }>
>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const { data, error } = await supabase
    .from("class_students")
    .select(
      `
      id,
      joined_at,
      class:teacher_classes (
        id,
        name,
        class_level,
        teacher:users!teacher_id (
          full_name
        )
      )
    `
    )
    .eq("student_id", user.id)
    .order("joined_at", { ascending: false })

  if (error) {
    console.error("[getMyClasses] Supabase error:", error)
    return { success: false, error: "Failed to load your classes" }
  }

  const result = (data ?? []).map((row) => {
    const cls = Array.isArray(row.class) ? row.class[0] : row.class
    const teacher = cls?.teacher
      ? Array.isArray(cls.teacher)
        ? cls.teacher[0]
        : cls.teacher
      : null

    return {
      id: cls?.id ?? "",
      name: cls?.name ?? "",
      classLevel: cls?.class_level ?? 0,
      teacherName: teacher?.full_name ?? "Unknown teacher",
      joinedAt: row.joined_at,
    }
  })

  return { success: true, data: result }
}

// ─── Teacher analytics ────────────────────────────────────────────────────────

/**
 * Returns progress stats for every student in a class.
 * Used on the teacher dashboard to spot struggling students.
 */
export async function getClassProgress(
  classId: string
): Promise<ActionResult<StudentProgress[]>> {
  const parsed = ClassIdSchema.safeParse({ classId })
  if (!parsed.success) return { success: false, error: "Invalid class ID" }

  const supabase = await createServerSupabaseClient()
  const { user, error: authError } = await requireTeacher(supabase)
  if (!user) return { success: false, error: authError! }

  // Verify ownership
  const { data: cls } = await supabase
    .from("teacher_classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single()

  if (!cls) return { success: false, error: "Class not found or access denied" }

  // Get all students in class
  const { data: enrollments, error: enrollError } = await supabase
    .from("class_students")
    .select(
      `
      student_id,
      student:users (
        id,
        full_name,
        xp,
        streak_count
      )
    `
    )
    .eq("class_id", classId)

  if (enrollError || !enrollments) {
    console.error("[getClassProgress] Enrollment error:", enrollError)
    return { success: false, error: "Failed to load class students" }
  }

  const studentIds = enrollments.map((e) => e.student_id)

  if (studentIds.length === 0) {
    return { success: true, data: [] }
  }

  // Fetch quiz sessions for all students in this class
  const { data: quizSessions } = await supabase
    .from("quiz_sessions")
    .select("user_id, score, question_count, completed_at")
    .in("user_id", studentIds)
    .not("completed_at", "is", null)

  // Fetch flashcard review counts
  const { data: reviewCounts } = await supabase
    .from("flashcard_reviews")
    .select("user_id")
    .in("user_id", studentIds)

  // Fetch note counts
  const { data: noteCounts } = await supabase
    .from("notes")
    .select("user_id")
    .in("user_id", studentIds)

  // Build per-student stats map
  const quizMap: Record<string, { count: number; totalScore: number; lastAt: string | null }> = {}
  for (const q of quizSessions ?? []) {
    if (!quizMap[q.user_id]) quizMap[q.user_id] = { count: 0, totalScore: 0, lastAt: null }
    quizMap[q.user_id].count++
    const pct = q.score
    quizMap[q.user_id].totalScore += pct
    if (!quizMap[q.user_id].lastAt || q.completed_at > quizMap[q.user_id].lastAt!) {
      quizMap[q.user_id].lastAt = q.completed_at
    }
  }

  const reviewMap: Record<string, number> = {}
  for (const r of reviewCounts ?? []) {
    reviewMap[r.user_id] = (reviewMap[r.user_id] ?? 0) + 1
  }

  const noteMap: Record<string, number> = {}
  for (const n of noteCounts ?? []) {
    noteMap[n.user_id] = (noteMap[n.user_id] ?? 0) + 1
  }

  // Combine into StudentProgress[]
  const progress: StudentProgress[] = enrollments.map((enrollment) => {
    const student = Array.isArray(enrollment.student)
      ? enrollment.student[0]
      : enrollment.student
    const sid = enrollment.student_id
    const quiz = quizMap[sid]
    const avgScore = quiz && quiz.count > 0 ? quiz.totalScore / quiz.count : 0

    return {
      studentId: sid,
      studentName: student?.full_name ?? "Unknown",
      xp: student?.xp ?? 0,
      streak: student?.streak_count ?? 0,
      quizzesTaken: quiz?.count ?? 0,
      flashcardsReviewed: reviewMap[sid] ?? 0,
      notesCreated: noteMap[sid] ?? 0,
      avgQuizScore: Math.round(avgScore),
      lastActiveAt: quiz?.lastAt ?? null,
    }
  })

  // Sort: highest XP first
  progress.sort((a, b) => b.xp - a.xp)

  return { success: true, data: progress }
}