import { useState } from "react"
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
  onUpdate: (problem: Problem, attempt: Attempt) => void
  onDelete: (attemptId: string) => void
}

interface AttemptDetailContentProps {
  problem: Problem
  attempt: Attempt
  onSnooze: (problemId: string) => void
  onUpdate: (problem: Problem, attempt: Attempt) => void
  onDelete: (attemptId: string) => void
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

function AttemptDetailContent({
  problem,
  attempt,
  onSnooze,
  onUpdate,
  onDelete,
}: AttemptDetailContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftProblem, setDraftProblem] = useState(problem)
  const [draftAttempt, setDraftAttempt] = useState(attempt)
  const [error, setError] = useState("")
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set())
  const daysUntilReview = daysUntil(problem.reviewDate)
  const reviewIsDue = daysUntilReview <= 0

  function cancelEditing() {
    setDraftProblem(problem)
    setDraftAttempt(attempt)
    setError("")
    setInvalidFields(new Set())
    setIsEditing(false)
  }

  function clearInvalidField(field: string) {
    setInvalidFields((previous) => {
      if (!previous.has(field)) return previous

      const next = new Set(previous)
      next.delete(field)
      return next
    })
  }

  function saveChanges() {
    const nextInvalidFields = new Set<string>()
    if (!draftProblem.year.trim()) nextInvalidFields.add("edit-problem-year")
    if (!draftProblem.contest.trim()) nextInvalidFields.add("edit-problem-contest")
    if (!draftProblem.problemNumber.trim()) nextInvalidFields.add("edit-problem-number")
    if (!draftProblem.subject) nextInvalidFields.add("edit-problem-subject")
    if (
      !Number.isFinite(draftProblem.rating)
      || draftProblem.rating < 1500
      || draftProblem.rating > 2000
    ) {
      nextInvalidFields.add("edit-problem-rating")
    }
    if (!draftAttempt.date) nextInvalidFields.add("edit-attempt-date")
    if (!draftAttempt.result) nextInvalidFields.add("edit-attempt-result")
    if (!draftAttempt.isReview && !draftAttempt.contestStatus) {
      nextInvalidFields.add("edit-attempt-contest-status")
    }
    if (!Number.isFinite(draftAttempt.timeSpent) || draftAttempt.timeSpent < 1) {
      nextInvalidFields.add("edit-attempt-time")
    }
    if (!draftAttempt.isReview && draftAttempt.result !== "independent" && !draftAttempt.mistakeType) {
      nextInvalidFields.add("edit-attempt-mistake-type")
    }

    if (nextInvalidFields.size > 0) {
      setInvalidFields(nextInvalidFields)
      setError("Please correct the highlighted fields before saving this log.")
      return
    }

    onUpdate(
      {
        ...draftProblem,
        year: draftProblem.year.trim(),
        contest: draftProblem.contest.trim().toUpperCase(),
        subcontest: draftProblem.subcontest.trim(),
        problemNumber: draftProblem.problemNumber.trim(),
        url: draftProblem.url.trim(),
      },
      {
        ...draftAttempt,
        mistakeType: draftAttempt.result === "independent" ? "" : draftAttempt.mistakeType,
        keyIdea: draftAttempt.keyIdea.trim(),
        recognitionClue: draftAttempt.recognitionClue.trim(),
      },
    )
    setError("")
    setInvalidFields(new Set())
    setIsEditing(false)
  }

  function deleteLog() {
    if (!window.confirm("Delete this log? This action cannot be undone.")) return
    onDelete(attempt.id)
  }

  if (isEditing) {
    return (
      <>
        <h1 id="page-title">Edit {attempt.isReview ? "review" : "problem log"}</h1>
        <div className="detail-layout edit-log-layout">
          <section className="dashboard-card log-panel">
            <h2 className="section-header">Problem details</h2>
            <div className="form-section log-panel-fields edit-log-fields">
              <label className="input-field">
                <span className="input-description">problem year</span>
                <input
                  className={`input-card ${invalidFields.has("edit-problem-year") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-problem-year")}
                  value={draftProblem.year} onChange={(event) => {
                  setDraftProblem({ ...draftProblem, year: event.target.value })
                  clearInvalidField("edit-problem-year")
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">contest</span>
                <input
                  className={`input-card ${invalidFields.has("edit-problem-contest") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-problem-contest")}
                  value={draftProblem.contest} onChange={(event) => {
                  setDraftProblem({ ...draftProblem, contest: event.target.value.toUpperCase() })
                  clearInvalidField("edit-problem-contest")
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">subcontest (optional)</span>
                <input className="input-card" value={draftProblem.subcontest} onChange={(event) => {
                  setDraftProblem({ ...draftProblem, subcontest: event.target.value })
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">problem number</span>
                <input
                  className={`input-card ${invalidFields.has("edit-problem-number") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-problem-number")}
                  value={draftProblem.problemNumber} onChange={(event) => {
                  setDraftProblem({ ...draftProblem, problemNumber: event.target.value })
                  clearInvalidField("edit-problem-number")
                }} />
              </label>
              <label className="input-field wide-field">
                <span className="input-description">url</span>
                <input className="input-card" type="url" value={draftProblem.url} onChange={(event) => {
                  setDraftProblem({ ...draftProblem, url: event.target.value })
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">subject</span>
                <select
                  className={`input-card ${invalidFields.has("edit-problem-subject") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-problem-subject")}
                  value={draftProblem.subject} onChange={(event) => {
                  setDraftProblem({ ...draftProblem, subject: event.target.value })
                  clearInvalidField("edit-problem-subject")
                }}>
                  <option value="" disabled>Select a subject</option>
                  {subjectOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="input-field">
                <span className="input-description">rating</span>
                <input
                  className={`input-card ${invalidFields.has("edit-problem-rating") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-problem-rating")}
                  type="number" min="1500" max="2000" step="50"
                  value={draftProblem.rating} onChange={(event) => {
                    setDraftProblem({ ...draftProblem, rating: Number(event.target.value) })
                    clearInvalidField("edit-problem-rating")
                  }} />
              </label>
            </div>
          </section>

          <section className="dashboard-card log-panel">
            <h2 className="section-header">{attempt.isReview ? "Review" : "Attempt"} details</h2>
            <div className="form-section log-panel-fields edit-log-fields">
              <label className="input-field">
                <span className="input-description">date</span>
                <input
                  className={`input-card ${invalidFields.has("edit-attempt-date") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-attempt-date")}
                  type="date" value={draftAttempt.date} onChange={(event) => {
                  setDraftAttempt({ ...draftAttempt, date: event.target.value })
                  clearInvalidField("edit-attempt-date")
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">result</span>
                <select
                  className={`input-card ${invalidFields.has("edit-attempt-result") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-attempt-result")}
                  value={draftAttempt.result} onChange={(event) => {
                  const nextResult = event.target.value
                  setDraftAttempt({
                    ...draftAttempt,
                    result: nextResult,
                    mistakeType: nextResult === "independent" ? "" : draftAttempt.mistakeType,
                  })
                  clearInvalidField("edit-attempt-result")
                  if (nextResult === "independent") clearInvalidField("edit-attempt-mistake-type")
                }}>
                  <option value="" disabled>Select a result</option>
                  {resultOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="input-field">
                <span className="input-description">time spent (minutes)</span>
                <input
                  className={`input-card ${invalidFields.has("edit-attempt-time") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-attempt-time")}
                  type="number" min="1" value={draftAttempt.timeSpent}
                  onChange={(event) => {
                    setDraftAttempt({ ...draftAttempt, timeSpent: Number(event.target.value) })
                    clearInvalidField("edit-attempt-time")
                  }} />
              </label>
              {!attempt.isReview && draftAttempt.result !== "independent" && (
                <label className="input-field">
                  <span className="input-description">mistake type</span>
                  <select
                    className={`input-card ${invalidFields.has("edit-attempt-mistake-type") ? "input-error" : ""}`}
                    aria-invalid={invalidFields.has("edit-attempt-mistake-type")}
                    value={draftAttempt.mistakeType} onChange={(event) => {
                    setDraftAttempt({ ...draftAttempt, mistakeType: event.target.value })
                    clearInvalidField("edit-attempt-mistake-type")
                  }}>
                    <option value="" disabled>Select a mistake type</option>
                    {mistakeTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {!attempt.isReview && (
                <label className="input-field">
                  <span className="input-description">contest rated or unrated?</span>
                  <select
                    className={`input-card ${invalidFields.has("edit-attempt-contest-status") ? "input-error" : ""}`}
                    aria-invalid={invalidFields.has("edit-attempt-contest-status")}
                    value={draftAttempt.contestStatus} onChange={(event) => {
                    setDraftAttempt({ ...draftAttempt, contestStatus: event.target.value })
                    clearInvalidField("edit-attempt-contest-status")
                  }}>
                    <option value="" disabled>Select rated or unrated</option>
                    {contestStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {!attempt.isReview && (
                <>
                  <label className="input-field wide-field">
                    <span className="input-description">what I learned</span>
                    <textarea className="input-card" value={draftAttempt.keyIdea} onChange={(event) => {
                      setDraftAttempt({ ...draftAttempt, keyIdea: event.target.value })
                    }} />
                  </label>
                  <label className="input-field wide-field">
                    <span className="input-description">recognition clue</span>
                    <textarea className="input-card" value={draftAttempt.recognitionClue} onChange={(event) => {
                      setDraftAttempt({ ...draftAttempt, recognitionClue: event.target.value })
                    }} />
                  </label>
                </>
              )}
            </div>
          </section>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="edit-log-actions">
          <button className="secondary-button" type="button" onClick={cancelEditing}>Cancel</button>
          <button className="button-style" type="button" onClick={saveChanges}>Save changes</button>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 id="page-title">{formatProblemTitle(problem)}</h1>

      <div className="detail-layout">
        <div>
          <article className="dashboard-card">
            <section className="detail-section" aria-labelledby="attempt-details-heading">
              <h2 id="attempt-details-heading">{attempt.isReview ? "Review" : "Attempt"} details</h2>
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
                {!attempt.isReview && (
                  <>
                    <div className="detail-item">
                      <dt>Mistake type</dt>
                      <dd>{optionLabel(mistakeTypeOptions, attempt.mistakeType, "None recorded")}</dd>
                    </div>
                    <div className="detail-item">
                      <dt>Contest status</dt>
                      <dd>{optionLabel(contestStatusOptions, attempt.contestStatus)}</dd>
                    </div>
                  </>
                )}
              </dl>
            </section>

            {!attempt.isReview && (
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
            )}
          </article>

          <div className="review-action">
            <button className="button-style" type="button" disabled={!reviewIsDue} onClick={() => {
              window.location.hash = `review-log-${problem.id}`
            }}>Log a review</button>
            <button className="danger-button" type="button" disabled={!reviewIsDue} onClick={() => {
              onSnooze(problem.id)
            }}>Snooze</button>
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
                  <dd><a href={problem.url} target="_blank" rel="noreferrer">Open problem</a></dd>
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

          <div className="form-actions log-detail-actions">
            <button className="secondary-button" type="button" onClick={() => {
              window.location.hash = "history"
            }}>Back to history</button>
            <button className="secondary-button" type="button" onClick={() => {
              setDraftProblem(problem)
              setDraftAttempt(attempt)
              setInvalidFields(new Set())
              setIsEditing(true)
            }}>Edit log</button>
            <button className="danger-button" type="button" onClick={deleteLog}>Delete log</button>
          </div>
        </aside>
      </div>
    </>
  )
}

function AttemptDetail({
  attemptId,
  problems,
  attempts,
  onSnooze,
  onUpdate,
  onDelete,
}: AttemptDetailProps) {
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
          <button className="secondary-button" type="button" onClick={() => {
            window.location.hash = "history"
          }}>Back to history</button>
        </section>
      </>
    )
  }

  return (
    <AttemptDetailContent
      key={attempt.id}
      problem={problem}
      attempt={attempt}
      onSnooze={onSnooze}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  )
}

export default AttemptDetail
