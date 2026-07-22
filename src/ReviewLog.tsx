import { useState } from "react"
import type { AttemptDraft, Problem } from "./types.ts"
import { mistakeTypeOptions, resultOptions, subjectOptions } from "./types.ts"
import { formatProblemTitle, labelForOption, localDateKey } from "./storage.ts"

interface ReviewLogProps {
  problemId: string
  problems: Problem[]
  onSave: (problemId: string, attempt: AttemptDraft) => void
}

const DEFAULT_TIME_SPENT = 15

function ReviewLog({ problemId, problems, onSave }: ReviewLogProps) {
  const [reviewDate, setReviewDate] = useState(() => localDateKey())
  const [result, setResult] = useState("")
  const [mistakeType, setMistakeType] = useState("")
  const [timeSpent, setTimeSpent] = useState(DEFAULT_TIME_SPENT)
  const [error, setError] = useState("")
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set())
  const problem = problems.find((item) => item.id === problemId)

  if (!problem) {
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

  function saveReview() {
    const nextInvalidFields = new Set<string>()
    if (!reviewDate) nextInvalidFields.add("review-date")
    if (!result) nextInvalidFields.add("review-result")
    if (result && result !== "independent" && !mistakeType) {
      nextInvalidFields.add("review-mistake-type")
    }

    if (nextInvalidFields.size > 0) {
      setInvalidFields(nextInvalidFields)
      setError("Please correct the highlighted fields before creating this log.")
      return
    }

    onSave(savedProblemId, {
      date: reviewDate,
      result,
      timeSpent,
      mistakeType: result === "independent" ? "" : mistakeType,
      keyIdea: "",
      recognitionClue: "",
      contestStatus: "",
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
              <span className="input-description">review date</span>
              <input
                className={`input-card ${invalidFields.has("review-date") ? "input-error" : ""}`}
                aria-invalid={invalidFields.has("review-date")}
                type="date"
                value={reviewDate}
                onChange={(event) => {
                  setReviewDate(event.target.value)
                  setError("")
                  setInvalidFields((previous) => {
                    const next = new Set(previous)
                    next.delete("review-date")
                    return next
                  })
                }}
              />
            </label>

            <label className="input-field">
              <span className="input-description">result</span>
              <select
                className={`input-card ${invalidFields.has("review-result") ? "input-error" : ""}`}
                aria-invalid={invalidFields.has("review-result")}
                value={result}
                onChange={(event) => {
                  const nextResult = event.target.value
                  setResult(nextResult)
                  if (nextResult === "independent") setMistakeType("")
                  setError("")
                  setInvalidFields((previous) => {
                    const next = new Set(previous)
                    next.delete("review-result")
                    if (nextResult === "independent") next.delete("review-mistake-type")
                    return next
                  })
                }}
              >
                <option value="" disabled>Select a result</option>
                {resultOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {result && result !== "independent" && (
              <label className="input-field">
                <span className="input-description">what went wrong</span>
                <select
                  className={`input-card ${invalidFields.has("review-mistake-type") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("review-mistake-type")}
                  value={mistakeType}
                  onChange={(event) => {
                    setMistakeType(event.target.value)
                    setError("")
                    setInvalidFields((previous) => {
                      const next = new Set(previous)
                      next.delete("review-mistake-type")
                      return next
                    })
                  }}
                >
                  <option value="" disabled>Select what went wrong</option>
                  {mistakeTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}

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
