import assert from "node:assert/strict"
import test from "node:test"
import { normalizeProblemData } from "./dataModel.ts"
import { loadProblemData } from "./storage.ts"

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear() { values.clear() },
    getItem(key) { return values.get(key) ?? null },
    key(index) { return [...values.keys()][index] ?? null },
    removeItem(key) { values.delete(key) },
    setItem(key, value) { values.set(key, value) },
  }
}

const problemA = {
  id: "problem-a",
  year: "2024",
  contest: "AMC10",
  subcontest: "A",
  problemNumber: "17",
  url: "",
  rating: 1700,
  subject: "algebra",
  reviewDate: "2026-01-10",
}

const attemptA = {
  id: "attempt-a",
  problemId: "problem-a",
  date: "2026-01-01",
  isReview: false,
  result: "tiny-hint",
  timeSpent: 15,
  mistakeType: "recognition-gap",
  keyIdea: "Factor first",
  recognitionClue: "Symmetric terms",
  contestStatus: "rated",
}

test("legacy attempts become contiguous numbered attempts", () => {
  const normalized = normalizeProblemData(
    [problemA],
    [
      { ...attemptA, id: "attempt-2", date: "2026-01-05", isReview: true },
      attemptA,
    ],
  )

  assert.equal(normalized.problems[0].numAttempts, 2)
  assert.deepEqual(normalized.attempts.map((attempt) => attempt.id), ["attempt-a", "attempt-2"])
  assert.deepEqual(normalized.attempts.map((attempt) => attempt.attemptNumber), [1, 2])
  assert.ok(normalized.attempts.every((attempt) => !("isReview" in attempt)))
})

test("duplicate problems merge without losing attempts or the latest source due date", () => {
  const duplicate = { ...problemA, id: "problem-a-copy", reviewDate: "2026-02-20" }
  const normalized = normalizeProblemData(
    [problemA, duplicate],
    [
      attemptA,
      { ...attemptA, id: "attempt-b", problemId: duplicate.id, date: "2026-02-01" },
    ],
  )

  assert.equal(normalized.problems.length, 1)
  assert.equal(normalized.problems[0].reviewDate, duplicate.reviewDate)
  assert.equal(normalized.problems[0].numAttempts, 2)
  assert.deepEqual(normalized.attempts.map((attempt) => attempt.problemId), [problemA.id, problemA.id])
})

test("storage migration creates one backup and becomes idempotent", () => {
  const storage = memoryStorage()
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true })
  storage.setItem("problems", JSON.stringify([problemA]))
  storage.setItem("attempts", JSON.stringify([attemptA]))

  const first = loadProblemData()
  const backup = storage.getItem("attempts-backup-before-attempt-number-v1")
  const second = loadProblemData()

  assert.equal(first.problems[0].numAttempts, 1)
  assert.equal(first.attempts[0].attemptNumber, 1)
  assert.equal(first.canPersist, true)
  assert.equal(backup, JSON.stringify([attemptA]))
  assert.deepEqual(second, first)
  assert.equal(storage.getItem("attempts-backup-before-attempt-number-v1"), backup)
})

test("current attempt numbers remain stable when dates are edited out of order", () => {
  const { isReview: _legacyKind, ...currentAttempt } = attemptA
  void _legacyKind
  const normalized = normalizeProblemData(
    [{ ...problemA, numAttempts: 2 }],
    [
      { ...currentAttempt, attemptNumber: 1, date: "2026-03-01" },
      { ...currentAttempt, id: "attempt-b", attemptNumber: 2, date: "2026-02-01" },
    ],
  )

  assert.deepEqual(normalized.attempts.map((attempt) => attempt.id), ["attempt-a", "attempt-b"])
  assert.equal(normalized.migrated, false)
})

test("malformed storage is not overwritten", () => {
  const storage = memoryStorage()
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true })
  storage.setItem("problems", "not-json")
  storage.setItem("attempts", JSON.stringify([attemptA]))

  const loaded = loadProblemData()

  assert.equal(loaded.canPersist, false)
  assert.equal(storage.getItem("problems"), "not-json")
  assert.equal(storage.getItem("problems-backup-before-attempt-number-v1"), null)
})
