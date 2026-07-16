const reviewDelayByResult: Record<string, number> = {
  independent: 30,
  "tiny-hint": 6,
  "large-hint": 4,
  "partial-solution": 3,
  "full-solution": 2,
}

export function getReviewDelayDays(result: string): number | null {
  return reviewDelayByResult[result] ?? null
}
