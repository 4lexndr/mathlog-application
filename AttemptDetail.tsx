import type { Attempt, Problem } from "./types.ts"
import {
  contestStatusOptions,
  mistakeTypeOptions,
  resultOptions,
  subjectOptions,
} from "./types.ts"
import {
  describeDueDate,
  formatDate,
  formatDuration,
  formatProblemTitle,
  getAttemptDueDate,
  getLatestAttemptByProblem,
  getReviewAttemptIds,
  labelForOption,
  localDateKey,
} from "./storage.ts"

interface AttemptDetailProps {
  attemptId: string
  problems: Problem[]
  attempts: Attempt[]
}

function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
  fallback = "Not recorded",
): string {
  return value ? labelForOption(options, value) : fallback
}

function AttemptDetail({ attemptId, problems, attempts }: AttemptDetailProps) {
  const attempt = attempts.find((item) => item.id === attemptId)
  const problem = attempt
    ? problems.find((item) => item.id === attempt.problemId)
    : undefined

  if (!attempt || !problem) {
    return (
      <>
        <h1 id="page-title">Attempt not found</h1>
        <section className="dashboard-card not-found-card">
          <p>This attempt may have been removed or the link may be incorrect.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              window.location.hash = "dashboard"
            }}
          >
            Back to dashboard
          </button>
        </section>
      </>
    )
  }

  const today = new Date()
  const todayKey = localDateKey(today)
  const dueDate = getAttemptDueDate(attempt)
  const latestAttempt = getLatestAttemptByProblem(attempts).get(problem.id)
  const isReview = getReviewAttemptIds(attempts).has(attempt.id)

  // Only the newest attempt controls the next review shown for a problem.
  const isLatestAttempt = latestAttempt?.id === attempt.id
  const isOverdue = isLatestAttempt && dueDate !== null && dueDate < todayKey

  return (
    <>
      <h1 id="page-title">{formatProblemTitle(problem)}</h1>

      <div className="detail-layout">
        <article className="dashboard-card">
          <section className="detail-section" aria-labelledby="attempt-details-heading">
            <h2 id="attempt-details-heading">Attempt details</h2>
            <dl className="detail-grid">
              <div className="detail-item">
                <dt>Date</dt>
                <dd>{formatDate(attempt.date, { dateStyle: "long" })}</dd>
              </div>
              <div className="detail-item">
                <dt>Attempt type</dt>
                <dd>{isReview ? "Review attempt" : "Initial attempt"}</dd>
              </div>
              <div className="detail-item">
                <dt>Result</dt>
                <dd>{optionLabel(resultOptions, attempt.result)}</dd>
              </div>
              <div className="detail-item">
                <dt>Time spent</dt>
                <dd>{formatDuration(attempt.timeSpent)}</dd>
              </div>
              <div className="detail-item">
                <dt>Mistake type</dt>
                <dd>{optionLabel(mistakeTypeOptions, attempt.mistakeType, "None recorded")}</dd>
              </div>
              <div className="detail-item">
                <dt>Contest status</dt>
                <dd>{optionLabel(contestStatusOptions, attempt.contestStatus)}</dd>
              </div>
            </dl>
          </section>

          <section className="detail-section" aria-labelledby="reflection-heading">
            <h2 id="reflection-heading">Learning</h2>
            <dl className="detail-grid">
              <div className="detail-item wide-field">
                <dt>What I learned</dt>
                <dd>{attempt.keyIdea || "Not recorded"}</dd>
              </div>
              <div className="detail-item wide-field">
                <dt>Recognition clue</dt>
                <dd>{attempt.recognitionClue || "Not recorded"}</dd>
              </div>
            </dl>
          </section>
        </article>

        <aside className="dashboard-card">
          <section className="detail-section" aria-labelledby="review-heading">
            <h2 id="review-heading">Review schedule</h2>
            {isLatestAttempt ? (
              <div className={`due-banner${isOverdue ? " overdue" : ""}`}>
                <strong>{describeDueDate(dueDate, today)}</strong>
                {dueDate && <p>Scheduled for {formatDate(dueDate, { dateStyle: "long" })}</p>}
              </div>
            ) : (
              <div className="due-banner superseded">
                <strong>Schedule superseded</strong>
                <p>A newer attempt now controls this problem&apos;s review date.</p>
              </div>
            )}
          </section>

          <section className="detail-section" aria-labelledby="problem-details-heading">
            <h2 id="problem-details-heading">Problem</h2>
            <dl className="detail-grid">
              <div className="detail-item">
                <dt>Subject</dt>
                <dd>{optionLabel(subjectOptions, problem.subject)}</dd>
              </div>
              <div className="detail-item">
                <dt>Rating</dt>
                <dd>{problem.rating}</dd>
              </div>
              {problem.url && (
                <div className="detail-item wide-field">
                  <dt>Source</dt>
                  <dd>
                    <a href={problem.url} target="_blank" rel="noreferrer">
                      Open problem
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {problem.screenshot && (
            <section className="detail-section" aria-labelledby="screenshot-heading">
              <h2 id="screenshot-heading">Screenshot</h2>
              <div className="screenshot-preview">
                <img src={problem.screenshot} alt={`Screenshot of ${formatProblemTitle(problem)}`} />
              </div>
            </section>
          )}

          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                window.location.hash = "dashboard"
              }}
            >
              Back to dashboard
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}

export default AttemptDetail
