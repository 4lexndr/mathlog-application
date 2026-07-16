import type { Attempt, Problem } from "./types.ts"
import { resultOptions } from "./types.ts"
import {
  formatDate,
  formatProblemTitle,
  labelForOption,
} from "./storage.ts"

interface HistoryProps {
  problems: Problem[]
  attempts: Attempt[]
}

interface HistoryCardProps {
  headingId: string
  title: string
  emptyTitle: string
  emptyDescription: string
  attempts: Attempt[]
  problemById: ReadonlyMap<string, Problem>
}

const HISTORY_LIMIT = 50

function HistoryCard({
  headingId,
  title,
  emptyTitle,
  emptyDescription,
  attempts,
  problemById,
}: HistoryCardProps) {
  return (
    <section className="dashboard-card" aria-labelledby={headingId}>
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Newest first</p>
          <h2 id={headingId} className="section-header">{title}</h2>
        </div>
        <span
          className="count-badge"
          aria-label={`${attempts.length} ${attempts.length === 1 ? "attempt" : "attempts"} shown`}
        >
          {attempts.length}
        </span>
      </div>

      {attempts.length === 0 ? (
        <div className="empty-state">
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        <div className="problem-list">
          {attempts.map((attempt) => {
            const problem = problemById.get(attempt.problemId)
            const result = labelForOption(resultOptions, attempt.result)

            return (
              <button
                key={attempt.id}
                className="problem-card problem-card-button"
                type="button"
                onClick={() => {
                  window.location.hash = encodeURIComponent(attempt.id)
                }}
              >
                <div className="problem-card-copy">
                  <h3>{problem ? formatProblemTitle(problem) : "Unknown problem"}</h3>
                  <div className="problem-meta">
                    <span>{formatDate(attempt.date, { dateStyle: "medium" })}</span>
                    <span>{result}</span>
                  </div>
                </div>
                <span className="history-arrow" aria-hidden="true">›</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function History({ problems, attempts }: HistoryProps) {
  const problemById = new Map(problems.map((problem) => [problem.id, problem]))
  const newestFirst = [...attempts].sort((first, second) => {
    const dateOrder = second.date.localeCompare(first.date)
    return dateOrder || second.id.localeCompare(first.id)
  })
  const initialAttempts = newestFirst
    .filter((attempt) => !attempt.isReview)
    .slice(0, HISTORY_LIMIT)
  const reviewAttempts = newestFirst
    .filter((attempt) => attempt.isReview)
    .slice(0, HISTORY_LIMIT)

  return (
    <>
      <h1 id="page-title">Attempt history</h1>

      <div className="history-layout">
        <HistoryCard
          headingId="history-heading"
          title="Previous attempts"
          emptyTitle="No attempts yet"
          emptyDescription="Completed logs will appear here, with the most recent attempt first."
          attempts={initialAttempts}
          problemById={problemById}
        />
        <HistoryCard
          headingId="review-history-heading"
          title="Reviews"
          emptyTitle="No reviews yet"
          emptyDescription="Completed review logs will appear here."
          attempts={reviewAttempts}
          problemById={problemById}
        />
      </div>
    </>
  )
}

export default History
