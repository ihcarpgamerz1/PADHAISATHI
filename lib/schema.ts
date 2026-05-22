import { z } from "zod"
import {
  AUTH,
  CLASS_LEVELS,
  AI_PROVIDERS,
  AI_SESSION_TYPES,
  NOTES,
  QUIZ_MODES,
  TEACHER,
} from "@/lib/constants"

// ─── Primitives ───────────────────────────────────────────────────────────────

export const UUIDSchema = z.string().uuid("Invalid ID format")

export const ClassLevelSchema = z
  .number()
  .int()
  .refine((v): v is 8 | 9 | 10 => CLASS_LEVELS.includes(v as 8 | 9 | 10), {
    message: "Class level must be 8, 9, or 10",
  })

export const EmailSchema = z.string().email("Invalid email address").toLowerCase()

export const PasswordSchema = z
  .string()
  .min(AUTH.MIN_PASSWORD_LENGTH, `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`)
  .max(AUTH.MAX_PASSWORD_LENGTH, "Password is too long")

export const PaginationSchema = z.object({
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const SignUpSchema = z.object({
  email:      EmailSchema,
  password:   PasswordSchema,
  fullName:   z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  classLevel: ClassLevelSchema,
})

export const SignInSchema = z.object({
  email:    EmailSchema,
  password: z.string().min(1, "Password is required"),
})

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
})

export const ResetPasswordSchema = z
  .object({
    password:        PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const UpdateProfileSchema = z.object({
  fullName:   z.string().min(2).max(100).trim().optional(),
  classLevel: ClassLevelSchema.optional(),
  avatarUrl:  z.string().url("Invalid URL").optional().nullable(),
})

// ─── Flashcard schemas ────────────────────────────────────────────────────────

export const CreateFlashcardSchema = z.object({
  chapterId:  UUIDSchema,
  question:   z.string().min(5, "Question must be at least 5 characters").max(1000).trim(),
  answer:     z.string().min(1, "Answer is required").max(2000).trim(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  hint:       z.string().max(500).optional().default(""),
})

export const UpdateFlashcardSchema = z.object({
  id:         UUIDSchema,
  question:   z.string().min(5).max(1000).trim().optional(),
  answer:     z.string().min(1).max(2000).trim().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  hint:       z.string().max(500).optional(),
  isActive:   z.boolean().optional(),
})

export const FlashcardReviewSchema = z.object({
  flashcardId: UUIDSchema,
  quality:     z.number().int().min(0).max(5),
})

export const BulkCreateFlashcardsSchema = z.object({
  chapterId:  UUIDSchema,
  flashcards: z
    .array(
      z.object({
        question:   z.string().min(5).max(1000).trim(),
        answer:     z.string().min(1).max(2000).trim(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        hint:       z.string().max(500).optional().default(""),
      })
    )
    .min(1, "At least one flashcard is required")
    .max(100, "Maximum 100 flashcards per import"),
})

// ─── Quiz schemas ─────────────────────────────────────────────────────────────

export const StartQuizSchema = z.object({
  chapterId: UUIDSchema,
  mode:      z.enum(QUIZ_MODES),
})

export const SubmitQuizAnswerSchema = z.object({
  sessionId:   UUIDSchema,
  flashcardId: UUIDSchema,
  userAnswer:  z.string().max(2000).trim(),
  timeTakenMs: z.number().int().min(0),
})

export const CompleteQuizSchema = z.object({
  sessionId: UUIDSchema,
})

// ─── Note schemas ─────────────────────────────────────────────────────────────

export const UpsertNoteSchema = z.object({
  chapterId: UUIDSchema,
  content: z
    .string()
    .min(NOTES.MIN_LENGTH, "Note cannot be empty")
    .max(NOTES.MAX_LENGTH, `Note cannot exceed ${NOTES.MAX_LENGTH} characters`),
})

export const DeleteNoteSchema = z.object({
  chapterId: UUIDSchema,
})

export const ToggleBookmarkSchema = z.object({
  chapterId: UUIDSchema,
})

// ─── AI session schemas ───────────────────────────────────────────────────────

export const LogAISessionSchema = z.object({
  provider:         z.enum(AI_PROVIDERS),
  sessionType:      z.enum(AI_SESSION_TYPES),
  chapterId:        UUIDSchema.nullable().optional(),
  subjectId:        UUIDSchema.nullable().optional(),
  promptTokens:     z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  durationMs:       z.number().int().min(0),
  success:          z.boolean(),
  errorCode:        z.string().nullable().optional(),
})

export const CheckRateLimitSchema = z.object({
  provider: z.enum(AI_PROVIDERS).optional(),
})

// ─── Teacher schemas ──────────────────────────────────────────────────────────

export const CreateClassSchema = z.object({
  name: z
    .string()
    .min(2, "Class name must be at least 2 characters")
    .max(80, "Class name cannot exceed 80 characters")
    .trim(),
  classLevel:  ClassLevelSchema,
  description: z.string().max(500).optional().default(""),
})

export const UpdateClassSchema = z.object({
  classId:     UUIDSchema,
  name:        z.string().min(2).max(80).trim().optional(),
  description: z.string().max(500).optional(),
  isActive:    z.boolean().optional(),
})

export const JoinClassSchema = z.object({
  joinCode: z
    .string()
    .min(TEACHER.JOIN_CODE_LENGTH, `Join code must be ${TEACHER.JOIN_CODE_LENGTH} characters`)
    .max(TEACHER.JOIN_CODE_LENGTH, `Join code must be ${TEACHER.JOIN_CODE_LENGTH} characters`)
    .toUpperCase(),
})

export const RemoveStudentSchema = z.object({
  classId:   UUIDSchema,
  studentId: UUIDSchema,
})

// ─── Subject / Chapter schemas ────────────────────────────────────────────────

export const CreateSubjectSchema = z.object({
  name:        z.string().min(2).max(100).trim(),
  classLevel:  ClassLevelSchema,
  color:       z.string().regex(/^[a-z]+$/).optional().default("blue"),
  icon:        z.string().max(50).optional().default("book"),
  orderIndex:  z.number().int().min(0).optional().default(0),
})

export const UpdateSubjectSchema = z.object({
  id:          UUIDSchema,
  name:        z.string().min(2).max(100).trim().optional(),
  color:       z.string().regex(/^[a-z]+$/).optional(),
  icon:        z.string().max(50).optional(),
  orderIndex:  z.number().int().min(0).optional(),
  isActive:    z.boolean().optional(),
})

export const CreateChapterSchema = z.object({
  subjectId:  UUIDSchema,
  name:       z.string().min(2).max(200).trim(),
  orderIndex: z.number().int().min(0).optional().default(0),
})

export const UpdateChapterSchema = z.object({
  id:         UUIDSchema,
  name:       z.string().min(2).max(200).trim().optional(),
  orderIndex: z.number().int().min(0).optional(),
  isActive:   z.boolean().optional(),
})

// ─── Admin schemas ────────────────────────────────────────────────────────────

export const AdminPermissionsSchema = z.object({
  userId:     UUIDSchema,
  role:       z.enum(["student", "teacher", "admin"]),
})

export const UpdateUserSchema = z.object({
  userId:     UUIDSchema,
  fullName:   z.string().min(2).max(100).trim().optional(),
  classLevel: ClassLevelSchema.optional(),
  role:       z.enum(["student", "teacher", "admin"]).optional(),
  isBanned:   z.boolean().optional(),
  banReason:  z.string().max(500).optional(),
})

export const BanUserSchema = z.object({
  userId: UUIDSchema,
  reason: z.string().min(1, "Ban reason is required").max(500),
})

export const AdjustXPSchema = z.object({
  userId: UUIDSchema,
  amount: z.number().int().refine((v) => v !== 0, "Amount cannot be zero"),
  reason: z.string().min(1, "Reason is required").max(500),
})

export const UserSearchSchema = z.object({
  query:      z.string().max(200).trim().optional().default(""),
  role:       z.enum(["student", "teacher", "admin", "all"]).optional().default("all"),
  classLevel: ClassLevelSchema.optional(),
  isBanned:   z.boolean().optional(),
  page:       z.number().int().min(1).default(1),
  pageSize:   z.number().int().min(1).max(100).default(20),
})

export const AIUsageOverviewSchema = z.object({
  days: z.number().int().min(1).max(90).default(7),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type SignUpInput             = z.infer<typeof SignUpSchema>
export type SignInInput             = z.infer<typeof SignInSchema>
export type UpdateProfileInput      = z.infer<typeof UpdateProfileSchema>
export type CreateFlashcardInput    = z.infer<typeof CreateFlashcardSchema>
export type UpdateFlashcardInput    = z.infer<typeof UpdateFlashcardSchema>
export type FlashcardReviewInput    = z.infer<typeof FlashcardReviewSchema>
export type StartQuizInput          = z.infer<typeof StartQuizSchema>
export type SubmitQuizAnswerInput   = z.infer<typeof SubmitQuizAnswerSchema>
export type UpsertNoteInput         = z.infer<typeof UpsertNoteSchema>
export type LogAISessionInput       = z.infer<typeof LogAISessionSchema>
export type CreateClassInput        = z.infer<typeof CreateClassSchema>
export type UpdateClassInput        = z.infer<typeof UpdateClassSchema>
export type JoinClassInput          = z.infer<typeof JoinClassSchema>
export type CreateSubjectInput      = z.infer<typeof CreateSubjectSchema>
export type CreateChapterInput      = z.infer<typeof CreateChapterSchema>
export type UpdateUserInput         = z.infer<typeof UpdateUserSchema>
export type BanUserInput            = z.infer<typeof BanUserSchema>
export type AdjustXPInput           = z.infer<typeof AdjustXPSchema>
export type UserSearchInput         = z.infer<typeof UserSearchSchema>