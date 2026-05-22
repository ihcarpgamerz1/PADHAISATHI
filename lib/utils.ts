import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// ─── Tailwind class merger ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Nepal timezone (UTC+5:45) ────────────────────────────────────────────────

export const NEPAL_OFFSET_MINUTES = 5 * 60 + 45 // 345 minutes

/**
 * Returns the current Date object adjusted to Nepal Standard Time (UTC+5:45).
 * Used anywhere we need "today" or "now" in Nepal time.
 */
export function getNepaliNow(): Date {
  const utcMs = Date.now()
  return new Date(utcMs + NEPAL_OFFSET_MINUTES * 60 * 1000)
}

/**
 * Returns a YYYY-MM-DD string in Nepal Standard Time.
 * Use this for streak date comparisons — never use UTC date.
 */
export function getNepaliDateString(date?: Date): string {
  const d = date ?? getNepaliNow()
  // If the date is already in Nepal time (from getNepaliNow()), format directly
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Converts a UTC ISO string (from Supabase) to Nepal Standard Time Date.
 */
export function utcToNepali(utcIso: string): Date {
  const utcDate = new Date(utcIso)
  return new Date(utcDate.getTime() + NEPAL_OFFSET_MINUTES * 60 * 1000)
}

/**
 * Returns true if two YYYY-MM-DD strings are consecutive days.
 */
export function areDatesConsecutive(earlier: string, later: string): boolean {
  const e = new Date(earlier + "T00:00:00Z")
  const l = new Date(later + "T00:00:00Z")
  const diffMs = l.getTime() - e.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays === 1
}

/**
 * Returns true if two YYYY-MM-DD strings are the same day.
 */
export function isSameDay(a: string, b: string): boolean {
  return a === b
}

// ─── Date formatters ──────────────────────────────────────────────────────────

/**
 * Formats a UTC ISO string into a human-readable Nepal time string.
 * e.g. "May 21, 2026 · 8:45 PM"
 */
export function formatNepaliDateTime(utcIso: string): string {
  const d = utcToNepali(utcIso)
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC", // already shifted, so treat as UTC
  }
  return new Intl.DateTimeFormat("en-US", options)
    .format(d)
    .replace(",", "")
    .replace(" at", " ·")
}

/**
 * Formats a UTC ISO string to a short relative label.
 * "Just now", "2 min ago", "3 hr ago", "Yesterday", "May 19"
 */
export function formatRelativeTime(utcIso: string): string {
  const nowMs = Date.now()
  const thenMs = new Date(utcIso).getTime()
  const diffMs = nowMs - thenMs
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr} hr ago`
  if (diffDay === 1) return "Yesterday"

  const d = new Date(utcIso)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d)
}

/**
 * Formats a duration in seconds to "MM:SS" or "HH:MM:SS".
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * Formats milliseconds to a human string: "1.2s", "340ms"
 */
export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

// ─── Number & score helpers ───────────────────────────────────────────────────

/**
 * Clamps a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Converts a 0–1 ratio to a percentage string: "73%"
 */
export function toPercent(ratio: number, decimals = 0): string {
  return `${(ratio * 100).toFixed(decimals)}%`
}

/**
 * Formats a large number with commas: 12345 → "12,345"
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

/**
 * Returns an ordinal suffix string: 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th"
 */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Rounds a number to a given number of decimal places.
 */
export function round(n: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

// ─── String helpers ───────────────────────────────────────────────────────────

/**
 * Truncates a string to maxLength, appending "…" if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + "…"
}

/**
 * Converts a string to a URL-safe slug.
 * "Class 10 Science" → "class-10-science"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Capitalises the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generates a random alphanumeric join code of given length.
 * Used for teacher class join codes.
 */
export function generateJoinCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous chars (0/O, 1/I)
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ─── Array helpers ────────────────────────────────────────────────────────────

/**
 * Shuffles an array in place (Fisher-Yates) and returns it.
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Picks N random items from an array without replacement.
 */
export function sample<T>(array: T[], n: number): T[] {
  return shuffle(array).slice(0, n)
}

/**
 * Groups an array of objects by a key.
 * groupBy([{a:1,b:'x'},{a:2,b:'x'}], 'b') → { x: [...] }
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const k = String(item[key])
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidClassLevel(level: number): boolean {
  return [8, 9, 10].includes(level)
}

// ─── Error helpers ────────────────────────────────────────────────────────────

/**
 * Extracts a human-readable message from any error type.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return "An unexpected error occurred"
}