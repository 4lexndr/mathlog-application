import type { Attempt, Problem } from "./types.ts"

type LegacyProblem = Omit<Problem, "numAttempts"> & { numAttempts?: number }
type LegacyAttempt = Omit<Attempt, "attemptNumber" | "contestStatus"> & {
  contestStatus?: string
  attemptNumber?: number
  isReview?: boolean
  pressureLevel?: string
}

export interface NormalizedProblemData {
  problems: Problem[]
  attempts: Attempt[]
  migrated: boolean
}

function identityKey(problem: LegacyProblem): string {
  return JSON.stringify([
    problem.year,
    problem.contest,
    problem.subcontest,
    problem.problemNumber,
  ].map((value) => value.trim().toLocaleLowerCase()))
}

export function normalizeProblemData(
  storedProblems: LegacyProblem[],
  storedAttempts: LegacyAttempt[],
): NormalizedProblemData {
  const canonicalByIdentity = new Map<string, LegacyProblem>()
  const canonicalIdByProblemId = new Map<string, string>()
  const sourceProblemById = new Map(storedProblems.map((problem) => [problem.id, problem]))
  let migrated = false

  for (const problem of storedProblems) {
    const identity = identityKey(problem)
    const canonical = canonicalByIdentity.get(identity)

    if (canonical) {
      canonicalIdByProblemId.set(problem.id, canonical.id)
      migrated = true
    } else {
      canonicalByIdentity.set(identity, problem)
      canonicalIdByProblemId.set(problem.id, problem.id)
    }
  }

  const attemptsByProblemId = new Map<string, Array<LegacyAttempt & { storageIndex: number }>>()
  storedAttempts.forEach((attempt, storageIndex) => {
    const canonicalId = canonicalIdByProblemId.get(attempt.problemId)
    if (!canonicalId) {
      migrated = true
      return
    }

    const group = attemptsByProblemId.get(canonicalId) ?? []
    group.push({ ...attempt, storageIndex })
    attemptsByProblemId.set(canonicalId, group)
  })

  const problems: Problem[] = []
  const attempts: Attempt[] = []

  for (const canonical of canonicalByIdentity.values()) {
    const groupedAttempts = attemptsByProblemId.get(canonical.id) ?? []
    if (groupedAttempts.length === 0) {
      migrated = true
      continue
    }

    const storedNumbers = groupedAttempts.map((attempt) => attempt.attemptNumber)
    const hasContiguousNumbers = storedNumbers.every((number) => (
      typeof number === "number" && Number.isInteger(number) && number > 0
    )) && new Set(storedNumbers).size === groupedAttempts.length
      && Math.max(...storedNumbers as number[]) === groupedAttempts.length
    groupedAttempts.sort(hasContiguousNumbers
      ? (first, second) => (first.attemptNumber ?? 0) - (second.attemptNumber ?? 0)
      : (first, second) => (
        first.date.localeCompare(second.date) || first.storageIndex - second.storageIndex
      ))

    const latestStoredAttempt = groupedAttempts.at(-1)
    const latestSourceProblem = latestStoredAttempt
      ? sourceProblemById.get(latestStoredAttempt.problemId)
      : undefined

    problems.push({
      ...canonical,
      reviewDate: latestSourceProblem?.reviewDate ?? canonical.reviewDate,
      numAttempts: groupedAttempts.length,
    })

    groupedAttempts.forEach((storedAttempt, index) => {
      const {
        attemptNumber,
        isReview,
        pressureLevel,
        storageIndex,
        ...attempt
      } = storedAttempt
      void isReview
      void pressureLevel
      void storageIndex

      const nextAttemptNumber = index + 1
      if (
        attemptNumber !== nextAttemptNumber
        || attempt.problemId !== canonical.id
        || isReview !== undefined
      ) migrated = true

      attempts.push({
        ...attempt,
        problemId: canonical.id,
        attemptNumber: nextAttemptNumber,
        contestStatus: attempt.contestStatus ?? "",
      })
    })

    if (canonical.numAttempts !== groupedAttempts.length) migrated = true
  }

  return { problems, attempts, migrated }
}

export function renumberAttempts(attempts: Attempt[]): Attempt[] {
  return [...attempts]
    .sort((first, second) => (
      first.attemptNumber - second.attemptNumber
      || first.date.localeCompare(second.date)
      || first.id.localeCompare(second.id)
    ))
    .map((attempt, index) => ({ ...attempt, attemptNumber: index + 1 }))
}
