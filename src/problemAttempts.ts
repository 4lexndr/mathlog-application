import { renumberAttempts } from "./dataModel.ts"
import { getNextReviewDate } from "./reviewSchedule.ts"
import type { Attempt, AttemptDraft, Problem } from "./types.ts"

export function appendAttempt(
  problem: Problem,
  draft: AttemptDraft,
  attemptId: string,
): { problem: Problem; attempt: Attempt } {
  const attemptNumber = problem.numAttempts + 1
  return {
    problem: {
      ...problem,
      numAttempts: attemptNumber,
      reviewDate: getNextReviewDate(draft.date, draft.result),
    },
    attempt: {
      ...draft,
      id: attemptId,
      problemId: problem.id,
      attemptNumber,
    },
  }
}

export function applyAttemptUpdate(
  problem: Problem,
  updatedAttempt: Attempt,
): Problem {
  if (updatedAttempt.attemptNumber !== problem.numAttempts) return problem
  return {
    ...problem,
    reviewDate: getNextReviewDate(updatedAttempt.date, updatedAttempt.result),
  }
}

export function removeAttempt(
  problem: Problem,
  problemAttempts: Attempt[],
  attemptId: string,
): { problem?: Problem; attempts: Attempt[] } {
  const deletedAttempt = problemAttempts.find((attempt) => attempt.id === attemptId)
  if (!deletedAttempt) return { problem, attempts: problemAttempts }

  const attempts = renumberAttempts(problemAttempts.filter((attempt) => attempt.id !== attemptId))
  if (attempts.length === 0) return { attempts }

  const latestAttempt = attempts.at(-1)
  return {
    attempts,
    problem: {
      ...problem,
      numAttempts: attempts.length,
      reviewDate: deletedAttempt.attemptNumber === problem.numAttempts && latestAttempt
        ? getNextReviewDate(latestAttempt.date, latestAttempt.result)
        : problem.reviewDate,
    },
  }
}
