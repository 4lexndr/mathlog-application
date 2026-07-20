import type { Attempt, Problem } from "./types.ts"
import {
  contestStatusOptions,
  mistakeTypeOptions,
  resultOptions,
  subjectOptions,
} from "./types.ts"
import { formatDate, formatDuration, formatProblemTitle, labelForOption } from "./storage.ts"

interface AttemptDetailProps {
  attemptId: string
  problems: Problem[]
  attempts: Attempt[]
  onSnooze: (problemId: string) => void
}

function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
  fallback = "Not recorded",
): string {
  return value ? labelForOption(options, value) : fallback
}

function daysUntil(reviewDate: string): number {
  const [year, month, day] = reviewDate.split("-").map(Number)
  const today = new Date()
  const reviewDay = Date.UTC(year, month - 1, day)
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

  return Math.round((reviewDay - currentDay) / (24 * 60 * 60 * 1000))
}

function AttemptDetail({ attemptId, problems, attempts, onSnooze }: AttemptDetailProps) {
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

  const daysUntilReview = daysUntil(problem.reviewDate)
  const reviewIsDue = daysUntilReview <= 0

  return (
    <>
      <h1 id="page-title">{formatProblemTitle(problem)}</h1>

      <div className="detail-layout">
        <div>
          <article className="dashboard-card">
            <section className="detail-section" aria-labelledby="attempt-details-heading">
              <h2 id="attempt-details-heading">Attempt details</h2>
              <dl className="detail-grid">
                <div className="detail-item">
                  <dt>Date</dt>
                  <dd>{formatDate(attempt.date, { dateStyle: "long" })}</dd>
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

          <div className="review-action">
            <button
              className="button-style"
              type="button"
              disabled={!reviewIsDue}
              onClick={() => {
                window.location.hash = `review-log-${problem.id}`
              }}
            >
              Log a review
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={!reviewIsDue}
              onClick={() => {
                onSnooze(problem.id)
              }}
            >
              Snooze
            </button>
            {!reviewIsDue && (
              <span className="review-hint">
                This problem will open for review in {daysUntilReview}{" "}
                {daysUntilReview === 1 ? "day" : "days"}.
              </span>
            )}
          </div>
        </div>

        <aside className="dashboard-card">
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
