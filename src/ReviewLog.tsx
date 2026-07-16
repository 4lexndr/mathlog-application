import { useState } from "react"
import type { Attempt, Problem } from "./types.ts"
import { resultOptions, subjectOptions } from "./types.ts"
import { formatProblemTitle, labelForOption } from "./storage.ts"

interface ReviewLogProps {
  problemId: string
  problems: Problem[]
  attempts: Attempt[]
  onSave: (attempt: Attempt) => void
}

const DEFAULT_TIME_SPENT = 15

function ReviewLog({ problemId, problems, attempts, onSave }: ReviewLogProps) {
  const [result, setResult] = useState("")
  const [timeSpent, setTimeSpent] = useState(DEFAULT_TIME_SPENT)
  const [error, setError] = useState("")
  const problem = problems.find((item) => item.id === problemId)
  const originalAttempt = attempts.find((item) => item.problemId === problemId)

  if (!problem || !originalAttempt) {
    return (
      <>
        <h1 id="page-title">Review not found</h1>
        <section className="dashboard-card not-found-card">
          <p>The problem for this review could not be found.</p>
        </section>
      </>
    )
  }

  const savedProblemId = problem.id
  const savedContestStatus = originalAttempt.contestStatus

  function saveReview() {
    if (!result) {
      setError("Please select a result for this review.")
      return
    }

    onSave({
      id: crypto.randomUUID(),
      problemId: savedProblemId,
      date: new Date().toISOString(),
      result,
      timeSpent,
      mistakeType: "",
      keyIdea: "",
      recognitionClue: "",
      contestStatus: savedContestStatus,
    })
  }

  return (
    <>
      <h1 id="page-title">Log a review</h1>

      <div className="review-log-layout">
        <aside className="dashboard-card review-context-card">
          <p className="section-kicker">Reviewing</p>
          <h2>{formatProblemTitle(problem)}</h2>

          <dl className="detail-grid review-context-grid">
            <div className="detail-item">
              <dt>Year</dt>
              <dd>{problem.year}</dd>
            </div>
            <div className="detail-item">
              <dt>Contest</dt>
              <dd>{problem.contest}</dd>
            </div>
            {problem.subcontest && (
              <div className="detail-item">
                <dt>Subcontest</dt>
                <dd>{problem.subcontest}</dd>
              </div>
            )}
            <div className="detail-item">
              <dt>Problem</dt>
              <dd>#{problem.problemNumber}</dd>
            </div>
            <div className="detail-item">
              <dt>Subject</dt>
              <dd>{labelForOption(subjectOptions, problem.subject)}</dd>
            </div>
            <div className="detail-item">
              <dt>Rating</dt>
              <dd>{problem.rating}</dd>
            </div>
          </dl>
        </aside>

        <section className="dashboard-card review-log-card" aria-labelledby="review-result-heading">
          <div>
            <p className="section-kicker">Review attempt</p>
            <h2 id="review-result-heading" className="section-header">How did it go?</h2>
          </div>

          <div className="review-log-fields">
            <label className="input-field">
              <span className="input-description">result</span>
              <select
                className="input-card"
                value={result}
                onChange={(event) => {
                  setResult(event.target.value)
                  setError("")
                }}
              >
                <option value="" disabled>Select a result</option>
                {resultOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className="slider-input">
              <div className="slider-input-header">
                <label className="input-description" htmlFor="review-time-spent">time spent</label>
                <span className="slider-value">{timeSpent} min</span>
              </div>
              <input
                id="review-time-spent"
                className="slider-track"
                type="range"
                min="1"
                max="30"
                value={timeSpent}
                onChange={(event) => {
                  setTimeSpent(Number(event.target.value))
                }}
              />
            </div>
          </div>

          <div className="review-log-footer">
            <button className="button-style" type="button" onClick={saveReview}>
              Create log
            </button>
            {error && <span className="log-form-error" role="alert">{error}</span>}
          </div>
        </section>
      </div>
    </>
  )
}

export default ReviewLog
