"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NOTES, XP } from "@/lib/constants"
import { getErrorMessage } from "@/lib/utils"
import { z } from "zod"

// ─── Schemas ──────────────────────────────────────────────────────────────────

const UpsertNoteSchema = z.object({
  chapterId: z.string().uuid("Invalid chapter ID"),
  content: z
    .string()
    .min(NOTES.MIN_LENGTH, "Note cannot be empty")
    .max(NOTES.MAX_LENGTH, `Note cannot exceed ${NOTES.MAX_LENGTH} characters`),
})

const ChapterIdSchema = z.object({
  chapterId: z.string().uuid("Invalid chapter ID"),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type Note = {
  id: string
  user_id: string
  chapter_id: string
  content: string
  word_count: number
  created_at: string
  updated_at: string
  chapter?: {
    id: string
    name: string
    subject?: {
      id: string
      name: string
      color: string
    }
  }
}

export type Bookmark = {
  id: string
  user_id: string
  chapter_id: string
  created_at: string
  chapter?: {
    id: string
    name: string
    order_index: number
    subject?: {
      id: string
      name: string
      color: string
      class_level: number
    }
  }
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ─── Note actions ─────────────────────────────────────────────────────────────

/**
 * Creates a new note or updates the existing note for a chapter.
 * Each user has exactly one note per chapter (upsert by user+chapter).
 * Awards XP only on first-time note creation.
 */
export async function upsertNote(
  input: z.infer<typeof UpsertNoteSchema>
): Promise<ActionResult<Note>> {
  const parsed = UpsertNoteSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { chapterId, content } = parsed.data
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in to save notes" }
  }

  const wordCount = countWords(content)

  // Check if note already exists (to decide whether to award XP)
  const { data: existing } = await supabase
    .from("notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .single()

  const isNew = !existing

  const { data, error } = await supabase
    .from("notes")
    .upsert(
      {
        user_id: user.id,
        chapter_id: chapterId,
        content,
        word_count: wordCount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,chapter_id",
        ignoreDuplicates: false,
      }
    )
    .select(
      `
      id,
      user_id,
      chapter_id,
      content,
      word_count,
      created_at,
      updated_at,
      chapter:chapters (
        id,
        name,
        subject:subjects (
          id,
          name,
          color
        )
      )
    `
    )
    .single()

  if (error) {
    console.error("[upsertNote] Supabase error:", error)
    return { success: false, error: "Failed to save note. Please try again." }
  }

  // Award XP only on first note creation — direct update avoids rpc() overhead
  if (isNew) {
    const { data: current } = await supabase
      .from("users")
      .select("xp")
      .eq("id", user.id)
      .single()

    if (current) {
      await supabase
        .from("users")
        .update({ xp: current.xp + XP.NOTE_CREATED, updated_at: new Date().toISOString() })
        .eq("id", user.id)
    }
  }

  revalidatePath(`/chapters/${chapterId}`)
  revalidatePath("/notes")

  return { success: true, data: data as Note }
}

/**
 * Returns the note for a specific chapter by the current user.
 * Returns null if no note exists yet.
 */
export async function getNoteByChapter(
  chapterId: string
): Promise<ActionResult<Note | null>> {
  const parsed = ChapterIdSchema.safeParse({ chapterId })
  if (!parsed.success) {
    return { success: false, error: parsed.data?.chapterId ?? "Invalid chapter ID" }
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const { data, error } = await supabase
    .from("notes")
    .select(
      `
      id,
      user_id,
      chapter_id,
      content,
      word_count,
      created_at,
      updated_at,
      chapter:chapters (
        id,
        name,
        subject:subjects (
          id,
          name,
          color
        )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .maybeSingle()

  if (error) {
    console.error("[getNoteByChapter] Supabase error:", error)
    return { success: false, error: "Failed to load note" }
  }

  return { success: true, data: data as Note | null }
}

/**
 * Returns all notes for the current user, ordered by most recently updated.
 */
export async function getAllNotes(page = 1, pageSize = 20): Promise<ActionResult<Note[]>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error } = await supabase
    .from("notes")
    .select(
      `
      id,
      user_id,
      chapter_id,
      content,
      word_count,
      created_at,
      updated_at,
      chapter:chapters (
        id,
        name,
        subject:subjects (
          id,
          name,
          color
        )
      )
    `
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("[getAllNotes] Supabase error:", error)
    return { success: false, error: "Failed to load notes" }
  }

  return { success: true, data: (data ?? []) as Note[] }
}

/**
 * Returns note count and total word count for the current user.
 */
export async function getNoteStats(): Promise<
  ActionResult<{ noteCount: number; totalWords: number }>
> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const { data, error } = await supabase
    .from("notes")
    .select("word_count")
    .eq("user_id", user.id)

  if (error) {
    console.error("[getNoteStats] Supabase error:", error)
    return { success: false, error: "Failed to load note stats" }
  }

  const noteCount = data.length
  const totalWords = data.reduce((sum, n) => sum + (n.word_count ?? 0), 0)

  return { success: true, data: { noteCount, totalWords } }
}

/**
 * Deletes the note for a chapter. Irreversible.
 */
export async function deleteNote(chapterId: string): Promise<ActionResult> {
  const parsed = ChapterIdSchema.safeParse({ chapterId })
  if (!parsed.success) {
    return { success: false, error: "Invalid chapter ID" }
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)

  if (error) {
    console.error("[deleteNote] Supabase error:", error)
    return { success: false, error: "Failed to delete note" }
  }

  revalidatePath(`/chapters/${chapterId}`)
  revalidatePath("/notes")

  return { success: true, data: undefined }
}

// ─── Bookmark actions ─────────────────────────────────────────────────────────

/**
 * Toggles a bookmark for a chapter.
 * Returns the new state: true = bookmarked, false = unbookmarked.
 */
export async function toggleBookmark(
  chapterId: string
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const parsed = ChapterIdSchema.safeParse({ chapterId })
  if (!parsed.success) {
    return { success: false, error: "Invalid chapter ID" }
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  // Check current state
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .maybeSingle()

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId)

    if (error) {
      console.error("[toggleBookmark] Delete error:", error)
      return { success: false, error: "Failed to remove bookmark" }
    }

    revalidatePath("/bookmarks")
    revalidatePath(`/chapters/${chapterId}`)
    return { success: true, data: { bookmarked: false } }
  } else {
    // Add bookmark
    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      chapter_id: chapterId,
    })

    if (error) {
      console.error("[toggleBookmark] Insert error:", error)
      return { success: false, error: "Failed to add bookmark" }
    }

    revalidatePath("/bookmarks")
    revalidatePath(`/chapters/${chapterId}`)
    return { success: true, data: { bookmarked: true } }
  }
}

/**
 * Returns whether the current user has bookmarked a chapter.
 */
export async function isBookmarked(
  chapterId: string
): Promise<ActionResult<boolean>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: true, data: false }

  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("chapter_id", chapterId)
    .maybeSingle()

  return { success: true, data: !!data }
}

/**
 * Returns all bookmarked chapters for the current user, newest first.
 */
export async function getBookmarks(page = 1, pageSize = 20): Promise<ActionResult<Bookmark[]>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "You must be signed in" }
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      `
      id,
      user_id,
      chapter_id,
      created_at,
      chapter:chapters (
        id,
        name,
        order_index,
        subject:subjects (
          id,
          name,
          color,
          class_level
        )
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("[getBookmarks] Supabase error:", error)
    return { success: false, error: "Failed to load bookmarks" }
  }

  return { success: true, data: (data ?? []) as Bookmark[] }
}

/**
 * Returns the set of chapter IDs the user has bookmarked.
 * Used to show bookmark state across a list of chapters efficiently.
 */
export async function getBookmarkedChapterIds(): Promise<ActionResult<Set<string>>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: true, data: new Set() }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("chapter_id")
    .eq("user_id", user.id)

  if (error) {
    console.error("[getBookmarkedChapterIds] Supabase error:", error)
    return { success: false, error: "Failed to load bookmarks" }
  }

  return {
    success: true,
    data: new Set((data ?? []).map((b) => b.chapter_id)),
  }
}