import assert from "node:assert/strict"
import test from "node:test"
import { appendAttempt, applyAttemptUpdate, removeAttempt } from "./problemAttempts.ts"
import type { Attempt, AttemptDraft, Problem } from "./types.ts"

const problem: Problem = {
  id: "problem-a",
  year: "2024",
  contest: "AMC10",
  subcontest: "A",
  problemNumber: "17",
  url: "",
  rating: 1700,
  subject: "algebra",
  reviewDate: "2026-01-10",
  numAttempts: 1,
}

const draft: AttemptDraft = {
  date: "2026-02-01",
  result: "full-solution",
  timeSpent: 15,
  mistakeType: "concept-gap",
  keyIdea: "",
  recognitionClue: "",
  contestStatus: "",
}

test("appending derives the number, count, and due date from the problem", () => {
  const appended = appendAttempt(problem, draft, "attempt-2")
  assert.equal(appended.attempt.attemptNumber, 2)
  assert.equal(appended.problem.numAttempts, 2)
  assert.equal(appended.problem.reviewDate, "2026-02-03")
})

test("only an update to the latest attempt changes scheduling", () => {
  const older: Attempt = { ...draft, id: "attempt-1", problemId: problem.id, attemptNumber: 1 }
  const latestProblem = { ...problem, numAttempts: 2 }
  assert.equal(applyAttemptUpdate(latestProblem, older), latestProblem)

  const latest = { ...older, attemptNumber: 2, date: "2026-03-01", result: "independent" }
  assert.equal(applyAttemptUpdate(latestProblem, latest).reviewDate, "2026-03-15")
})

test("deleting renumbers attempts and recalculates from a removed latest attempt", () => {
  const attempts: Attempt[] = [
    { ...draft, id: "attempt-1", problemId: problem.id, attemptNumber: 1, date: "2026-01-01" },
    { ...draft, id: "attempt-2", problemId: problem.id, attemptNumber: 2, date: "2026-01-10" },
    { ...draft, id: "attempt-3", problemId: problem.id, attemptNumber: 3, date: "2026-01-20" },
  ]
  const result = removeAttempt({ ...problem, numAttempts: 3 }, attempts, "attempt-3")

  assert.deepEqual(result.attempts.map((attempt) => attempt.attemptNumber), [1, 2])
  assert.equal(result.problem?.numAttempts, 2)
  assert.equal(result.problem?.reviewDate, "2026-01-12")
})
