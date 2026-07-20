import type { Attempt, Problem } from "./types.ts"

const PROBLEMS_KEY = "problems"
const ATTEMPTS_KEY = "attempts"
const SETTINGS_KEY = "settings"
const PREFERENCES_KEY = "preferences"

type StoredAttempt = Omit<Attempt, "contestStatus"> & {
  contestStatus?: string
  pressureLevel?: string
}

export interface AppSettings {
  defaultSubject: string
  defaultRating: number
  defaultContestStatus: string
}

export interface LogPreferences {
  rating: number
  subject: string
  contestStatus: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultSubject: "",
  defaultRating: 1600,
  defaultContestStatus: "",
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
export function saveData(problems: Problem[], attempts: Attempt[]): void {
  localStorage.setItem(PROBLEMS_KEY, JSON.stringify(problems))
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
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
