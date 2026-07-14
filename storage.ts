import type { Attempt, AttemptResult, MathlogStore, Problem, PressureLevel, Subject } from './types'

export const STORAGE_KEY = 'mathlog:v2'

const EMPTY_STORE: MathlogStore = { version: 2, problems: [], attempts: [] }

type LegacyProblem = {
  id?: string
  source?: string
  url?: string
  rating?: string | number
  subject?: string
  screenshot?: string
}

type LegacyAttempt = {
  id?: string
  problem_id?: string
  date?: string
  result?: string
  time_spent?: string | number
  mistake_type?: string
  key_idea?: string
  recognition_clue?: string
  pressure_level?: string
}

function makeId(prefix: 'prb' | 'att') {
  return `${prefix}-${crypto.randomUUID()}`
}

export function normalizeReference(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeProblemUrl(value: string) {
  const raw = value.trim()
  if (!raw) return ''

  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    const hostname = parsed.hostname.toLocaleLowerCase().replace(/^www\./, '')
    const pathname = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'

    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) parsed.searchParams.delete(key)
    }
    parsed.searchParams.sort()
    const query = parsed.searchParams.toString()
    return `${hostname}${parsed.port ? `:${parsed.port}` : ''}${pathname}${query ? `?${query}` : ''}`
  } catch {
    return raw.toLocaleLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
  }
}

export function findMatchingProblem(
  problems: Problem[],
  identity: { reference: string; url: string },
) {
  const normalizedUrl = normalizeProblemUrl(identity.url)
  if (normalizedUrl) {
    const urlMatch = problems.find(
      (problem) => (problem.normalizedUrl || normalizeProblemUrl(problem.url)) === normalizedUrl,
    )
    if (urlMatch) return urlMatch
  }

  const normalizedReference = normalizeReference(identity.reference)
  if (normalizedReference) {
    return problems.find(
      (problem) =>
        (problem.normalizedReference || normalizeReference(problem.reference)) === normalizedReference,
    )
  }

  return undefined
}

export function createProblem(input: {
  reference: string
  url: string
  subject: Subject
  screenshot: string
}): Problem {
  const now = new Date().toISOString()
  return {
    id: makeId('prb'),
    reference: input.reference.trim(),
    url: input.url.trim(),
    subject: input.subject,
    screenshot: input.screenshot || undefined,
    normalizedReference: normalizeReference(input.reference),
    normalizedUrl: normalizeProblemUrl(input.url),
    createdAt: now,
  }
}

export function createAttempt(input: Omit<Attempt, 'id' | 'attemptedAt'>): Attempt {
  return {
    ...input,
    id: makeId('att'),
    attemptedAt: new Date().toISOString(),
  }
}

function isSubject(value: string | undefined): value is Subject {
  return ['algebra', 'combinatorics', 'geometry', 'number-theory'].includes(value ?? '')
}

function migrateResult(value: string | undefined): AttemptResult {
  if (['independent', 'tiny-hint', 'large-hint', 'partial-solution', 'full-solution'].includes(value ?? '')) {
    return value as AttemptResult
  }
  return 'independent'
}

function migratePressure(value: string | undefined): PressureLevel {
  return ['low', 'medium', 'high'].includes(value ?? '') ? (value as PressureLevel) : 'medium'
}

function migrateLegacyStore(): MathlogStore {
  let legacyProblems: LegacyProblem[] = []
  let legacyAttempts: LegacyAttempt[] = []

  try {
    const parsedProblems = JSON.parse(localStorage.getItem('problems') ?? '[]')
    const parsedAttempts = JSON.parse(localStorage.getItem('attempts') ?? '[]')
    legacyProblems = Array.isArray(parsedProblems) ? parsedProblems : []
    legacyAttempts = Array.isArray(parsedAttempts) ? parsedAttempts : []
  } catch {
    return EMPTY_STORE
  }

  const now = new Date().toISOString()
  const problems: Problem[] = []
  const migratedProblemId = new Map<string, string>()

  for (const legacyProblem of legacyProblems) {
    const problem: Problem = {
      id: legacyProblem.id || makeId('prb'),
      reference: legacyProblem.source?.trim() || 'Untitled problem',
      url: legacyProblem.url?.trim() || '',
      subject: isSubject(legacyProblem.subject) ? legacyProblem.subject : 'algebra',
      screenshot: legacyProblem.screenshot || undefined,
      normalizedReference: normalizeReference(legacyProblem.source || 'Untitled problem'),
      normalizedUrl: normalizeProblemUrl(legacyProblem.url || ''),
      createdAt: now,
    }
    const duplicate = findMatchingProblem(problems, problem)
    const canonicalProblem = duplicate ?? problem
    if (!duplicate) problems.push(problem)
    if (legacyProblem.id) migratedProblemId.set(legacyProblem.id, canonicalProblem.id)
  }

  const problemById = new Map(problems.map((problem) => [problem.id, problem]))
  const attempts: Attempt[] = legacyAttempts.flatMap((attempt) => {
    const problemId = migratedProblemId.get(attempt.problem_id || '') ?? attempt.problem_id ?? ''
    const problem = problemById.get(problemId)
    if (!problem) return []

    const legacyProblem = legacyProblems.find((item) => item.id === attempt.problem_id)
    const parsedDuration = Number(attempt.time_spent)
    const parsedRating = Number(legacyProblem?.rating)
    const date = attempt.date && /^\d{4}-\d{2}-\d{2}$/.test(attempt.date)
      ? `${attempt.date}T12:00:00.000Z`
      : now

    return [{
      id: attempt.id || makeId('att'),
      problemId,
      attemptedAt: date,
      result: migrateResult(attempt.result),
      durationMinutes: Number.isFinite(parsedDuration) ? parsedDuration : 0,
      perceivedRating: Number.isFinite(parsedRating) ? parsedRating : 1600,
      mistakeType: attempt.mistake_type && attempt.mistake_type !== 'none' ? attempt.mistake_type : undefined,
      keyIdea: attempt.key_idea?.trim() || '',
      recognitionClue: attempt.recognition_clue?.trim() || '',
      pressureLevel: migratePressure(attempt.pressure_level),
    }]
  })

  return { version: 2, problems, attempts }
}

export function loadStore(): MathlogStore {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as MathlogStore
      if (parsed.version === 2 && Array.isArray(parsed.problems) && Array.isArray(parsed.attempts)) {
        return parsed
      }
    }
  } catch {
    // Fall back to the legacy keys or a clean store below.
  }

  const migrated = migrateLegacyStore()
  saveStore(migrated)
  return migrated
}

export function saveStore(store: MathlogStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getAttemptNumber(attempt: Attempt, attempts: Attempt[]) {
  return attempts
    .filter((item) => item.problemId === attempt.problemId)
    .sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt))
    .findIndex((item) => item.id === attempt.id) + 1
}

export function isReviewAttempt(attempt: Attempt, attempts: Attempt[]) {
  return getAttemptNumber(attempt, attempts) > 1
}
