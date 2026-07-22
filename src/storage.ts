import type { Attempt, Contest, Problem } from "./types.ts"
import { normalizeProblemData } from "./dataModel.ts"

const PROBLEMS_KEY = "problems"
const ATTEMPTS_KEY = "attempts"
const CONTESTS_KEY = "contests"
const SETTINGS_KEY = "settings"
const PREFERENCES_KEY = "preferences"
const PROBLEMS_BACKUP_KEY = "problems-backup-before-attempt-number-v1"
const ATTEMPTS_BACKUP_KEY = "attempts-backup-before-attempt-number-v1"

type StoredAttempt = Omit<Attempt, "contestStatus" | "attemptNumber"> & {
  contestStatus?: string
  attemptNumber?: number
  isReview?: boolean
  pressureLevel?: string
}

type StoredProblem = Omit<Problem, "numAttempts"> & { numAttempts?: number }

export interface ProblemData {
  problems: Problem[]
  attempts: Attempt[]
  canPersist: boolean
}

export interface AppSettings {
  defaultSubject: string
  defaultRating: number
  defaultContestStatus: string
  colorTheme: ColorTheme
}

export type ColorTheme = "crimson" | "cream" | "sage" | "sky-blue" | "dark"

export const colorThemeOptions: ReadonlyArray<{ value: ColorTheme; label: string }> = [
  { value: "crimson", label: "Crimson" },
  { value: "cream", label: "Cream" },
  { value: "sage", label: "Sage" },
  { value: "sky-blue", label: "Sky blue" },
  { value: "dark", label: "Dark" },
]

export interface LogPreferences {
  rating: number
  subject: string
  contestStatus: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultSubject: "",
  defaultRating: 1600,
  defaultContestStatus: "",
  colorTheme: "cream",
}

interface SevenDayPerformance {
  independent: number
  tinyHint: number
  total: number
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

// Normalize the two related collections together so their IDs, counts, and numbering stay valid.
export function loadProblemData(): ProblemData {
  const rawProblems = localStorage.getItem(PROBLEMS_KEY) ?? "[]"
  const rawAttempts = localStorage.getItem(ATTEMPTS_KEY) ?? "[]"
  let storedProblems: StoredProblem[]
  let storedAttempts: StoredAttempt[]
  try {
    const parsedProblems: unknown = JSON.parse(rawProblems)
    const parsedAttempts: unknown = JSON.parse(rawAttempts)
    if (!Array.isArray(parsedProblems) || !Array.isArray(parsedAttempts)) {
      return { problems: [], attempts: [], canPersist: false }
    }
    storedProblems = parsedProblems as StoredProblem[]
    storedAttempts = parsedAttempts as StoredAttempt[]
  } catch {
    return { problems: [], attempts: [], canPersist: false }
  }

  let normalized
  try {
    normalized = normalizeProblemData(storedProblems, storedAttempts)
  } catch {
    return { problems: [], attempts: [], canPersist: false }
  }

  if (normalized.migrated) {
    try {
      if (localStorage.getItem(PROBLEMS_BACKUP_KEY) === null) {
        localStorage.setItem(PROBLEMS_BACKUP_KEY, rawProblems)
      }
      if (localStorage.getItem(ATTEMPTS_BACKUP_KEY) === null) {
        localStorage.setItem(ATTEMPTS_BACKUP_KEY, rawAttempts)
      }
      localStorage.setItem(PROBLEMS_KEY, JSON.stringify(normalized.problems))
      localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(normalized.attempts))
    } catch {
      try {
        localStorage.setItem(PROBLEMS_KEY, rawProblems)
        localStorage.setItem(ATTEMPTS_KEY, rawAttempts)
      } catch {
        // The original raw values remain the recovery source when storage is unavailable.
      }
      return { problems: normalized.problems, attempts: normalized.attempts, canPersist: false }
    }
  }

  return { problems: normalized.problems, attempts: normalized.attempts, canPersist: true }
}

export function loadContests(): Contest[] {
  return loadArray<unknown>(CONTESTS_KEY).filter((item): item is Contest => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false

    const contest = item as Partial<Contest>
    return typeof contest.id === "string"
      && typeof contest.year === "string"
      && typeof contest.contest === "string"
      && typeof contest.subcontest === "string"
      && typeof contest.date === "string"
      && typeof contest.score === "number"
      && Number.isFinite(contest.score)
      && contest.score >= 0
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
    const savedTheme = saved.colorTheme
    const colorTheme = colorThemeOptions.some((option) => option.value === savedTheme)
      ? savedTheme as ColorTheme
      : DEFAULT_APP_SETTINGS.colorTheme
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
      colorTheme,
    }
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// Load only valid saved fields so an absent or empty preference record changes nothing.
export function loadPreferences(): Partial<LogPreferences> {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored?.trim()) return {}

    const parsed: unknown = JSON.parse(stored)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}

    const saved = parsed as Partial<LogPreferences>
    const preferences: Partial<LogPreferences> = {}

    if (typeof saved.rating === "number" && Number.isFinite(saved.rating)) {
      preferences.rating = Math.min(2000, Math.max(1500, Math.round(saved.rating / 50) * 50))
    }
    if (["algebra", "combinatorics", "geometry", "number-theory"].includes(saved.subject ?? "")) {
      preferences.subject = saved.subject
    }
    if (saved.contestStatus === "rated" || saved.contestStatus === "unrated") {
      preferences.contestStatus = saved.contestStatus
    }

    return preferences
  } catch {
    return {}
  }
}

export function savePreferences(preferences: LogPreferences): void {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}

// Save both related collections from one place so App does not know their storage keys.
export function saveData(problems: Problem[], attempts: Attempt[], contests: Contest[]): void {
  localStorage.setItem(PROBLEMS_KEY, JSON.stringify(problems))
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
  localStorage.setItem(CONTESTS_KEY, JSON.stringify(contests))
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

// Build a normalized key for the four fields that uniquely identify a problem.
export function problemIdentityKey(problem: Pick<
  Problem,
  "year" | "contest" | "subcontest" | "problemNumber"
>): string {
  return JSON.stringify([
    problem.year,
    problem.contest,
    problem.subcontest,
    problem.problemNumber,
  ].map((value) => value.trim().toLocaleLowerCase()))
}

export function formatContestTitle(contest: Contest): string {
  return [contest.year, contest.contest, contest.subcontest]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ") || "Untitled contest"
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
