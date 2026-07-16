import type { Attempt, Problem } from "./types.ts"

const PROBLEMS_KEY = "problems"
const ATTEMPTS_KEY = "attempts"
const SETTINGS_KEY = "settings"
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

type StoredAttempt = Omit<Attempt, "contestStatus"> & {
  contestStatus?: string
  pressureLevel?: string
}

export interface AppSettings {
  defaultSubject: string
  defaultRating: number
  defaultContestStatus: string
  adaptiveReviewScheduling: boolean
  defaultReviewDays: number | null
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultSubject: "",
  defaultRating: 1600,
  defaultContestStatus: "",
  adaptiveReviewScheduling: true,
  defaultReviewDays: null,
}

interface DueProblem {
  problem: Problem
  attempt: Attempt
  dueDate: string
}

interface SevenDayPerformance {
  independent: number
  tinyHint: number
  total: number
}

interface WeeklyReviewStats {
  startDate: string
  endDate: string
  problemsAttempted: number
  reviewsAttempted: number
  topicsLearned: number
  independentPercentage: number
  tinyHintPercentage: number
}

interface ReviewRecommendation {
  minDays: number
  maxDays: number
  recommendedDays: number
  reason: string
}

// Read one JSON array without allowing missing or broken storage data to crash the app.
function loadArray<T>(key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]")
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

// Turn a Date, timestamp, or YYYY-MM-DD value into a Date in the user's timezone.
function toLocalDate(value: Date | string): Date {
  if (value instanceof Date) return new Date(value.getTime())

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
  }

  return new Date(value)
}

// Format stored dates without shifting date-only values across time zones.
export function formatDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = toLocalDate(value)
  if (Number.isNaN(date.getTime())) return "Unknown date"

  return new Intl.DateTimeFormat(undefined, options).format(date)
}

// Convert a YYYY-MM-DD key to a day number that is not affected by daylight saving time.
function dateKeyToDayNumber(value: string): number | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!parts) return null

  return Math.floor(
    Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) / MILLISECONDS_PER_DAY,
  )
}

// Load the saved problems when App creates its initial state.
export function loadProblems(): Problem[] {
  return loadArray<Problem>(PROBLEMS_KEY)
}

// Load the saved attempts when App creates its initial state.
export function loadAttempts(): Attempt[] {
  return loadArray<StoredAttempt>(ATTEMPTS_KEY).map((attempt) => {
    const { pressureLevel, ...currentAttempt } = attempt
    void pressureLevel

    return {
      ...currentAttempt,
      contestStatus: currentAttempt.contestStatus ?? "",
    }
  })
}

// Load user preferences defensively so malformed settings cannot break the app.
export function loadSettings(): AppSettings {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null")
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_APP_SETTINGS }

    const saved = parsed as Partial<AppSettings>
    const rawRating = typeof saved.defaultRating === "number" && Number.isFinite(saved.defaultRating)
      ? saved.defaultRating
      : DEFAULT_APP_SETTINGS.defaultRating
    const defaultRating = Math.min(2000, Math.max(1500, Math.round(rawRating / 50) * 50))
    const rawReviewDays = saved.defaultReviewDays
    const defaultReviewDays = typeof rawReviewDays === "number"
      && Number.isSafeInteger(rawReviewDays)
      && rawReviewDays >= 0
      ? rawReviewDays
      : null

    return {
      defaultSubject: ["algebra", "combinatorics", "geometry", "number-theory"].includes(
        saved.defaultSubject ?? "",
      )
        ? saved.defaultSubject ?? ""
        : "",
      defaultRating,
      defaultContestStatus: saved.defaultContestStatus === "rated"
        || saved.defaultContestStatus === "unrated"
        ? saved.defaultContestStatus
        : "",
      adaptiveReviewScheduling: typeof saved.adaptiveReviewScheduling === "boolean"
        ? saved.adaptiveReviewScheduling
        : true,
      defaultReviewDays,
    }
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// Save both related collections from one place so App does not know their storage keys.
export function saveData(problems: Problem[], attempts: Attempt[]): void {
  localStorage.setItem(PROBLEMS_KEY, JSON.stringify(problems))
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
}

// Return undefined for invalid input so forms can distinguish it from no schedule.
export function parseReviewDays(value: string): number | null | undefined {
  if (value === "") return null

  const days = Number(value)
  return Number.isSafeInteger(days) && days >= 0 ? days : undefined
}

// Build the short title used by dashboard cards and log-detail pages.
export function formatProblemTitle(problem: Problem): string {
  const source = [problem.year, problem.contest, problem.subcontest]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
  const number = problem.problemNumber.trim() ? `#${problem.problemNumber.trim()}` : ""

  return [source, number].filter(Boolean).join(" ") || "Untitled problem"
}

// Display a raw minute count as "45 min", "1h", or "1h 30m".
export function formatDuration(minutes: number): string {
  const totalMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  if (hours === 0) return `${remainingMinutes} min`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

// Find a user-facing option label while keeping unknown old values readable.
export function labelForOption(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value
}

// Return YYYY-MM-DD using local date parts rather than UTC date parts.
export function localDateKey(value: Date | string = new Date()): string {
  const date = toLocalDate(value)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Add calendar days and return another local YYYY-MM-DD key.
export function addCalendarDays(value: Date | string, days: number): string {
  const date = toLocalDate(value)
  if (Number.isNaN(date.getTime())) return ""

  date.setDate(date.getDate() + Math.trunc(days))
  return localDateKey(date)
}

// Calculate an attempt's due date from its saved interval.
export function getAttemptDueDate(attempt: Attempt): string | null {
  if (attempt.reviewAfterDays === null) return null

  const dueDate = addCalendarDays(attempt.date, attempt.reviewAfterDays)
  return dueDate || null
}

// Suggest a review interval from the kind of help and mistake recorded.
export function getReviewRecommendation(
  result: string,
  mistakeType: string,
): ReviewRecommendation | null {
  const carelessMistakes = new Set([
    "execution-error",
    "overcounting-undercounting",
    "edge-case-omission",
    "misread",
    "pressure-rushing",
    "careless-arithmetic-algebra",
  ])

  if (carelessMistakes.has(mistakeType)) {
    return {
      minDays: 7,
      maxDays: 14,
      recommendedDays: 10,
      reason: "a careless or execution error",
    }
  }

  if (mistakeType === "concept-gap" || mistakeType === "modeling-gap") {
    return {
      minDays: 2,
      maxDays: 4,
      recommendedDays: 3,
      reason: "a concept or modeling gap",
    }
  }

  if (mistakeType === "recognition-gap") {
    return {
      minDays: 5,
      maxDays: 8,
      recommendedDays: 6,
      reason: "a recognition gap",
    }
  }

  if (mistakeType === "premature-abandonment" || mistakeType === "unproductive-fixation") {
    return {
      minDays: 3,
      maxDays: 5,
      recommendedDays: 4,
      reason: "an approach-selection issue",
    }
  }

  if (result === "tiny-hint") {
    return { minDays: 5, maxDays: 8, recommendedDays: 6, reason: "a tiny hint" }
  }

  if (result === "large-hint") {
    return { minDays: 3, maxDays: 5, recommendedDays: 4, reason: "a large hint" }
  }

  if (result === "partial-solution") {
    return { minDays: 2, maxDays: 4, recommendedDays: 3, reason: "major assistance" }
  }

  if (result === "full-solution") {
    return { minDays: 1, maxDays: 3, recommendedDays: 2, reason: "seeing the full solution" }
  }

  return null
}

// Describe a due date relative to today for dashboard and detail-page text.
export function describeDueDate(
  dueDate: string | null,
  today: Date | string = new Date(),
): string {
  if (!dueDate) return "No review scheduled"

  const dueDay = dateKeyToDayNumber(localDateKey(dueDate))
  const todayDay = dateKeyToDayNumber(localDateKey(today))
  if (dueDay === null || todayDay === null) return "Unknown review date"

  const difference = dueDay - todayDay
  if (difference === 0) return "Due today"
  if (difference === 1) return "Due tomorrow"
  if (difference > 1) return `Due in ${difference} days`
  if (difference === -1) return "1 day overdue"
  return `${Math.abs(difference)} days overdue`
}

// Keep only the newest attempt for each problem ID.
export function getLatestAttemptByProblem(attempts: Attempt[]): Map<string, Attempt> {
  const latestAttempts = new Map<string, Attempt>()

  for (const attempt of attempts) {
    const current = latestAttempts.get(attempt.problemId)
    if (!current || attempt.date >= current.date) {
      latestAttempts.set(attempt.problemId, attempt)
    }
  }

  return latestAttempts
}

// Mark every attempt after the first saved attempt for the same problem as a review.
export function getReviewAttemptIds(attempts: Attempt[]): Set<string> {
  const firstAttemptByProblem = new Map<string, Attempt>()

  for (const attempt of attempts) {
    const firstAttempt = firstAttemptByProblem.get(attempt.problemId)
    if (!firstAttempt || attempt.date < firstAttempt.date) {
      firstAttemptByProblem.set(attempt.problemId, attempt)
    }
  }

  return new Set(
    attempts
      .filter((attempt) => firstAttemptByProblem.get(attempt.problemId)?.id !== attempt.id)
      .map((attempt) => attempt.id),
  )
}

// Return problems whose latest attempt is due today or overdue, earliest first.
export function getDueProblems(
  problems: Problem[],
  attempts: Attempt[],
  today: Date | string = new Date(),
): DueProblem[] {
  const todayKey = localDateKey(today)
  const latestAttempts = getLatestAttemptByProblem(attempts)

  return problems
    .flatMap((problem): DueProblem[] => {
      const attempt = latestAttempts.get(problem.id)
      if (!attempt) return []

      const dueDate = getAttemptDueDate(attempt)
      if (!dueDate || dueDate > todayKey) return []

      return [{ problem, attempt, dueDate }]
    })
    .sort((first, second) => {
      const dateOrder = first.dueDate.localeCompare(second.dueDate)
      return dateOrder || formatProblemTitle(first.problem).localeCompare(formatProblemTitle(second.problem))
    })
}

// Count independent and tiny-hint attempts from today and the previous six days.
export function getSevenDayPerformance(
  attempts: Attempt[],
  today: Date | string = new Date(),
): SevenDayPerformance {
  const endDate = localDateKey(today)
  const startDate = addCalendarDays(today, -6)
  let independent = 0
  let tinyHint = 0

  for (const attempt of attempts) {
    const attemptDate = localDateKey(attempt.date)
    if (!attemptDate || attemptDate < startDate || attemptDate > endDate) continue

    if (attempt.result === "independent") independent += 1
    if (attempt.result === "tiny-hint") tinyHint += 1
  }

  return { independent, tinyHint, total: independent + tinyHint }
}

// Summarize the last completed Monday-Sunday week in the user's timezone.
export function getPreviousWeekStats(
  attempts: Attempt[],
  today: Date | string = new Date(),
): WeeklyReviewStats {
  const currentDate = toLocalDate(today)
  if (Number.isNaN(currentDate.getTime())) {
    return {
      startDate: "",
      endDate: "",
      problemsAttempted: 0,
      reviewsAttempted: 0,
      topicsLearned: 0,
      independentPercentage: 0,
      tinyHintPercentage: 0,
    }
  }

  const daysSinceMonday = (currentDate.getDay() + 6) % 7
  const currentWeekStart = addCalendarDays(currentDate, -daysSinceMonday)
  const startDate = addCalendarDays(currentWeekStart, -7)
  const endDate = addCalendarDays(startDate, 6)
  const previousWeekAttempts = attempts.filter((attempt) => {
    const attemptDate = localDateKey(attempt.date)
    return attemptDate >= startDate && attemptDate <= endDate
  })
  const reviewAttemptIds = getReviewAttemptIds(attempts)
  const problemsAttempted = previousWeekAttempts.length
  const reviewsAttempted = previousWeekAttempts.filter((attempt) => (
    reviewAttemptIds.has(attempt.id)
  )).length
  const topicsLearned = previousWeekAttempts.filter((attempt) => attempt.keyIdea?.trim()).length
  const independent = previousWeekAttempts.filter((attempt) => attempt.result === "independent").length
  const tinyHint = previousWeekAttempts.filter((attempt) => attempt.result === "tiny-hint").length

  return {
    startDate,
    endDate,
    problemsAttempted,
    reviewsAttempted,
    topicsLearned,
    independentPercentage: problemsAttempted === 0 ? 0 : Math.round((independent / problemsAttempted) * 100),
    tinyHintPercentage: problemsAttempted === 0 ? 0 : Math.round((tinyHint / problemsAttempted) * 100),
  }
}
