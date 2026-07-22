import { addCalendarDays } from "./storage.ts"

const reviewDelayByResult: Record<string, number> = {
  independent: 14,
  "tiny-hint": 6,
  "large-hint": 4,
  "partial-solution": 3,
  "full-solution": 2,
}

export function getReviewDelayDays(result: string): number {
  return reviewDelayByResult[result]
}

export function getNextReviewDate(attemptDate: string, result: string): string {
  return addCalendarDays(attemptDate, getReviewDelayDays(result))
}
