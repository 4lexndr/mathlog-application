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

const HISTORY_LIMIT = 50

function History({ problems, attempts }: HistoryProps) {
  const problemById = new Map(problems.map((problem) => [problem.id, problem]))

  // Bound the rendered list while keeping the newest attempts visible.
  const visibleAttempts = [...attempts]
    .sort((first, second) => {
      const dateOrder = second.date.localeCompare(first.date)
      return dateOrder || second.id.localeCompare(first.id)
    })
    .slice(0, HISTORY_LIMIT)

  return (
    <>
      <h1 id="page-title">Attempt history</h1>

      <section className="dashboard-card" aria-labelledby="history-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Newest first</p>
            <h2 id="history-heading" className="section-header">Previous attempts</h2>
          </div>
          <span
            className="count-badge"
            aria-label={`${visibleAttempts.length} ${visibleAttempts.length === 1 ? "attempt" : "attempts"} shown`}
          >
            {visibleAttempts.length}
          </span>
        </div>

        {visibleAttempts.length === 0 ? (
          <div className="empty-state">
            <h3>No attempts yet</h3>
            <p>Completed logs will appear here, with the most recent attempt first.</p>
          </div>
        ) : (
          <div className="problem-list">
            {visibleAttempts.map((attempt) => {
              const problem = problemById.get(attempt.problemId)
              const result = attempt.result
                ? labelForOption(resultOptions, attempt.result)
                : "Result not recorded"

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

        {attempts.length > HISTORY_LIMIT && (
          <p className="performance-note">
            Showing the 50 most recent of {attempts.length} attempts.
          </p>
        )}
      </section>
    </>
  )
}

export default History
