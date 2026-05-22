// ─── App metadata ─────────────────────────────────────────────────────────────

export const APP_NAME = "PadhaiSathi" as const
export const APP_TAGLINE = "Free AI-powered revision for Nepal students" as const
export const ADMIN_EMAIL = "ihcarpgamerz@gmail.com" as const

// ─── Class levels (Nepal CDC) ─────────────────────────────────────────────────

export const CLASS_LEVELS = [8, 9, 10] as const
export type ClassLevel = (typeof CLASS_LEVELS)[number]

export const CLASS_LEVEL_LABELS: Record<ClassLevel, string> = {
  8: "Class 8",
  9: "Class 9",
  10: "Class 10",
}

// ─── User roles ───────────────────────────────────────────────────────────────

export const USER_ROLES = ["student", "teacher", "admin"] as const
export type UserRole = (typeof USER_ROLES)[number]

// ─── XP system ────────────────────────────────────────────────────────────────

export const XP = {
  // Flashcard review (SM-2 quality 0–5)
  FLASHCARD_QUALITY_0: 0,   // complete blackout
  FLASHCARD_QUALITY_1: 2,   // wrong but remembered on seeing answer
  FLASHCARD_QUALITY_2: 5,   // wrong but easy recall
  FLASHCARD_QUALITY_3: 10,  // correct with serious difficulty
  FLASHCARD_QUALITY_4: 15,  // correct with hesitation
  FLASHCARD_QUALITY_5: 20,  // perfect recall

  // Quiz modes
  QUIZ_CORRECT_SCHOLAR: 10,   // Scholar mode — untimed
  QUIZ_CORRECT_STORM: 15,     // Storm mode — timed pressure
  QUIZ_CORRECT_SOVEREIGN: 20, // Sovereign mode — hardest

  // Perfect quiz bonus (all correct)
  QUIZ_PERFECT_BONUS: 50,

  // Streak bonuses (awarded once per day)
  STREAK_BONUS_BASE: 25,        // any active streak
  STREAK_BONUS_WEEK: 50,        // 7-day streak
  STREAK_BONUS_FORTNIGHT: 100,  // 14-day streak
  STREAK_BONUS_MONTH: 200,      // 30-day streak

  // Notes
  NOTE_CREATED: 5,

  // First actions
  FIRST_FLASHCARD_REVIEW: 30,
  FIRST_QUIZ_COMPLETED: 50,
  PROFILE_COMPLETED: 20,

  // Level thresholds (XP needed per level)
  PER_LEVEL: 500,
} as const

/**
 * Returns XP earned for a flashcard review quality (0–5).
 */
export function xpForFlashcardQuality(quality: number): number {
  const map: Record<number, number> = {
    0: XP.FLASHCARD_QUALITY_0,
    1: XP.FLASHCARD_QUALITY_1,
    2: XP.FLASHCARD_QUALITY_2,
    3: XP.FLASHCARD_QUALITY_3,
    4: XP.FLASHCARD_QUALITY_4,
    5: XP.FLASHCARD_QUALITY_5,
  }
  return map[quality] ?? 0
}

/**
 * Returns the user level for a given total XP.
 * Level 1 starts at 0 XP. Level 2 at 500, etc.
 */
export function xpToLevel(xp: number): number {
  return Math.floor(xp / XP.PER_LEVEL) + 1
}

/**
 * Returns XP progress within the current level (0–499).
 */
export function xpProgressInLevel(xp: number): number {
  return xp % XP.PER_LEVEL
}

// ─── SM-2 algorithm config ────────────────────────────────────────────────────

export const SM2 = {
  /** Initial ease factor for all new cards */
  INITIAL_EASE: 2.5,
  /** Minimum ease factor — cards never go below this */
  MIN_EASE: 1.3,
  /** Ease delta per quality score (added to ease factor) */
  EASE_DELTA: [
    -0.8,  // q=0: big penalty
    -0.54, // q=1
    -0.32, // q=2
    -0.14, // q=3: slight penalty
    0,     // q=4: no change
    0.1,   // q=5: slight boost
  ] as const,
  /** First interval after first correct review (days) */
  FIRST_INTERVAL: 1,
  /** Second interval after second correct review (days) */
  SECOND_INTERVAL: 6,
  /** Quality threshold below which the card resets to day 1 */
  RESET_THRESHOLD: 3,
} as const

// ─── Quiz config ──────────────────────────────────────────────────────────────

export const QUIZ_MODES = ["scholar", "storm", "sovereign"] as const
export type QuizMode = (typeof QUIZ_MODES)[number]

export const QUIZ_MODE_CONFIG: Record<
  QuizMode,
  {
    label: string
    description: string
    timePerQuestion: number | null // seconds, null = untimed
    questionCount: number
    xpPerCorrect: number
    passMark: number // 0–1 ratio to "pass"
    color: string
  }
> = {
  scholar: {
    label: "Scholar",
    description: "Learn at your own pace. No time pressure.",
    timePerQuestion: null,
    questionCount: 10,
    xpPerCorrect: XP.QUIZ_CORRECT_SCHOLAR,
    passMark: 0.6,
    color: "blue",
  },
  storm: {
    label: "Storm",
    description: "Race against the clock. 30 seconds per question.",
    timePerQuestion: 30,
    questionCount: 15,
    xpPerCorrect: XP.QUIZ_CORRECT_STORM,
    passMark: 0.7,
    color: "amber",
  },
  sovereign: {
    label: "Sovereign",
    description: "Master mode. 20 seconds. No hints. Max XP.",
    timePerQuestion: 20,
    questionCount: 20,
    xpPerCorrect: XP.QUIZ_CORRECT_SOVEREIGN,
    passMark: 0.8,
    color: "purple",
  },
}

// Maximum questions we ever pull for a single quiz session
export const QUIZ_MAX_QUESTIONS = 20

// Minimum flashcards a chapter needs before quiz is available
export const QUIZ_MIN_FLASHCARDS = 5

// ─── Streak config ────────────────────────────────────────────────────────────

export const STREAK = {
  /** Grace period in days before a streak breaks (0 = strict daily) */
  GRACE_DAYS: 0,
  /** Milestones that earn bonus XP */
  MILESTONES: [7, 14, 30, 60, 100, 365] as const,
  /** XP bonus per milestone (index matches MILESTONES) */
  MILESTONE_XP: [50, 100, 200, 400, 750, 2000] as const,
} as const

// ─── Leaderboard config ───────────────────────────────────────────────────────

export const LEADERBOARD = {
  PERIODS: ["weekly", "monthly", "all_time"] as const,
  PAGE_SIZE: 50,
  TOP_DISPLAY: 10, // how many to show on dashboard widget
} as const

export type LeaderboardPeriod = (typeof LEADERBOARD.PERIODS)[number]

// ─── AI providers ─────────────────────────────────────────────────────────────

export const AI_PROVIDERS = ["kimi", "groq", "gemini"] as const
export type AIProvider = (typeof AI_PROVIDERS)[number]

export const AI_SESSION_TYPES = [
  "flashcard_generate",   // generate flashcards for a chapter
  "quiz_generate",        // generate quiz questions
  "explanation",          // explain a concept
  "doubt",                // answer a student doubt
  "summary",              // summarise chapter notes
] as const
export type AISessionType = (typeof AI_SESSION_TYPES)[number]

export const AI_RATE_LIMITS: Record<AIProvider, { requestsPerDay: number; tokensPerDay: number }> = {
  kimi:   { requestsPerDay: 50, tokensPerDay: 100_000 },
  groq:   { requestsPerDay: 100, tokensPerDay: 200_000 },
  gemini: { requestsPerDay: 60, tokensPerDay: 120_000 },
}

/**
 * Per-user daily limits across all providers combined.
 * Free tier students are capped to prevent abuse.
 */
export const USER_AI_LIMITS = {
  REQUESTS_PER_DAY: 30,
  TOKENS_PER_DAY: 50_000,
} as const

export const AI_MODELS: Record<AIProvider, string> = {
  kimi:   "moonshot-v1-8k",
  groq:   "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
}

// ─── Subjects config (Nepal CDC, Classes 8-10) ────────────────────────────────

export const SUBJECT_COLORS: Record<string, string> = {
  "Mathematics":        "blue",
  "Science":            "green",
  "Social Studies":     "amber",
  "English":            "purple",
  "Nepali":             "coral",
  "Health & Physical":  "teal",
  "Computer Science":   "gray",
  "Optional Maths":     "pink",
  "Moral Education":    "coral",
} as const

// ─── Notes config ─────────────────────────────────────────────────────────────

export const NOTES = {
  MAX_LENGTH: 10_000,    // characters
  MIN_LENGTH: 1,
  MAX_PER_CHAPTER: 1,    // one note per chapter per user (edit in place)
} as const

// ─── Pagination defaults ──────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

// ─── Auth config ──────────────────────────────────────────────────────────────

export const AUTH = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 72,
  SESSION_COOKIE: "sb-session",
} as const

// ─── Teacher config ───────────────────────────────────────────────────────────

export const TEACHER = {
  MAX_CLASSES: 10,
  MAX_STUDENTS_PER_CLASS: 100,
  JOIN_CODE_LENGTH: 6,
  JOIN_CODE_EXPIRY_DAYS: 30,
} as const