import { useMemo, useState } from "react"
import type { Attempt, Problem } from "./types.ts"
import { resultOptions, subjectOptions } from "./types.ts"
import {
  formatDate,
  formatDuration,
  formatProblemTitle,
  labelForOption,
  localDateKey,
  problemIdentityKey,
} from "./storage.ts"

interface ProblemDetailProps {
  problemId: string
  problems: Problem[]
  attempts: Attempt[]
  onSnooze: (problemId: string) => void
  onUpdate: (problem: Problem) => void
}

function ProblemDetail({
  problemId,
  problems,
  attempts,
  onSnooze,
  onUpdate,
}: ProblemDetailProps) {
  const problem = problems.find((item) => item.id === problemId)
  const [isEditing, setIsEditing] = useState(false)
  const [draftProblem, setDraftProblem] = useState(problem)
  const [error, setError] = useState("")
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set())
  const problemAttempts = useMemo(() => attempts
    .filter((attempt) => attempt.problemId === problemId)
    .sort((first, second) => first.attemptNumber - second.attemptNumber), [attempts, problemId])

  if (!problem || !draftProblem) {
    return (
      <>
        <h1 id="page-title">Problem not found</h1>
        <section className="dashboard-card not-found-card">
          <p>This problem may have been removed or the link may be incorrect.</p>
          <button className="secondary-button" type="button" onClick={() => {
            window.location.hash = "history"
          }}>Back to problem history</button>
        </section>
      </>
    )
  }

  const reviewIsDue = problem.reviewDate <= localDateKey()

  function clearInvalidField(field: string) {
    setInvalidFields((previous) => {
      const next = new Set(previous)
      next.delete(field)
      return next
    })
  }

  function saveProblem() {
    if (!draftProblem || !problem) return
    const nextInvalidFields = new Set<string>()
    if (!draftProblem.year.trim()) nextInvalidFields.add("edit-problem-year")
    if (!draftProblem.contest.trim()) nextInvalidFields.add("edit-problem-contest")
    if (!draftProblem.problemNumber.trim()) nextInvalidFields.add("edit-problem-number")
    if (!draftProblem.subject) nextInvalidFields.add("edit-problem-subject")
    if (
      !Number.isFinite(draftProblem.rating)
      || draftProblem.rating < 1500
      || draftProblem.rating > 2000
    ) nextInvalidFields.add("edit-problem-rating")

    const normalizedDraft = {
      ...draftProblem,
      year: draftProblem.year.trim(),
      contest: draftProblem.contest.trim().toUpperCase(),
      subcontest: draftProblem.subcontest.trim(),
      problemNumber: draftProblem.problemNumber.trim(),
      url: draftProblem.url.trim(),
    }
    const identityAlreadyExists = problems.some((candidate) => (
      candidate.id !== problem.id
      && problemIdentityKey(candidate) === problemIdentityKey(normalizedDraft)
    ))
    if (identityAlreadyExists) nextInvalidFields.add("edit-problem-identity")

    if (nextInvalidFields.size > 0) {
      setInvalidFields(nextInvalidFields)
      setError(identityAlreadyExists
        ? "Another problem already uses this year, contest, subcontest, and number."
        : "Please correct the highlighted fields before saving this problem.")
      return
    }

    onUpdate(normalizedDraft)
    setError("")
    setInvalidFields(new Set())
    setIsEditing(false)
  }

  if (isEditing) {
    const identityError = invalidFields.has("edit-problem-identity")
    return (
      <>
        <h1 id="page-title">Edit problem</h1>
        <section className="dashboard-card log-panel problem-edit-panel">
          <h2 className="section-header">Problem details</h2>
          <div className="form-section log-panel-fields edit-log-fields">
            <label className="input-field">
              <span className="input-description">problem year</span>
              <input
                className={`input-card ${invalidFields.has("edit-problem-year") || identityError ? "input-error" : ""}`}
                value={draftProblem.year}
                onChange={(event) => {
                  setDraftProblem({ ...draftProblem, year: event.target.value })
                  clearInvalidField("edit-problem-year")
                  clearInvalidField("edit-problem-identity")
                }}
              />
            </label>
            <label className="input-field">
              <span className="input-description">contest</span>
              <input
                className={`input-card ${invalidFields.has("edit-problem-contest") || identityError ? "input-error" : ""}`}
                value={draftProblem.contest}
                onChange={(event) => {
                  setDraftProblem({ ...draftProblem, contest: event.target.value.toUpperCase() })
                  clearInvalidField("edit-problem-contest")
                  clearInvalidField("edit-problem-identity")
                }}
              />
            </label>
            <label className="input-field">
              <span className="input-description">subcontest (optional)</span>
              <input
                className={`input-card ${identityError ? "input-error" : ""}`}
                value={draftProblem.subcontest}
                onChange={(event) => {
                  setDraftProblem({ ...draftProblem, subcontest: event.target.value })
                  clearInvalidField("edit-problem-identity")
                }}
              />
            </label>
            <label className="input-field">
              <span className="input-description">problem number</span>
              <input
                className={`input-card ${invalidFields.has("edit-problem-number") || identityError ? "input-error" : ""}`}
                value={draftProblem.problemNumber}
                onChange={(event) => {
                  setDraftProblem({ ...draftProblem, problemNumber: event.target.value })
                  clearInvalidField("edit-problem-number")
                  clearInvalidField("edit-problem-identity")
                }}
              />
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
                value={draftProblem.subject}
                onChange={(event) => {
                  setDraftProblem({ ...draftProblem, subject: event.target.value })
                  clearInvalidField("edit-problem-subject")
                }}
              >
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
                type="number"
                min="1500"
                max="2000"
                step="50"
                value={draftProblem.rating}
                onChange={(event) => {
                  setDraftProblem({ ...draftProblem, rating: Number(event.target.value) })
                  clearInvalidField("edit-problem-rating")
                }}
              />
            </label>
          </div>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="edit-log-actions">
          <button className="secondary-button" type="button" onClick={() => {
            setDraftProblem(problem)
            setError("")
            setInvalidFields(new Set())
            setIsEditing(false)
          }}>Cancel</button>
          <button className="button-style" type="button" onClick={saveProblem}>Save problem</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="problem-detail-heading">
        <div>
          <p className="section-kicker">Problem details</p>
          <h1 id="page-title">{formatProblemTitle(problem)}</h1>
        </div>
        <div className="problem-detail-actions">
          <button className="secondary-button" type="button" onClick={() => {
            setDraftProblem(problem)
            setIsEditing(true)
          }}>Edit problem</button>
          <button className="button-style" type="button" disabled={!reviewIsDue} onClick={() => {
            window.location.hash = `review-log-${problem.id}`
          }}>Log an attempt</button>
          <button className="danger-button" type="button" disabled={!reviewIsDue} onClick={() => {
            onSnooze(problem.id)
          }}>Snooze</button>
        </div>
      </div>

      <section className="problem-overview" aria-label="Problem overview">
        <dl className="problem-overview-grid">
          <div><dt>Subject</dt><dd>{labelForOption(subjectOptions, problem.subject)}</dd></div>
          <div><dt>Rating</dt><dd>{problem.rating}</dd></div>
          <div><dt>Attempts</dt><dd>{problem.numAttempts}</dd></div>
          <div><dt>Next review</dt><dd>{formatDate(problem.reviewDate, { dateStyle: "medium" })}</dd></div>
        </dl>
        {problem.url && <a href={problem.url} target="_blank" rel="noreferrer">Open source problem ↗</a>}
      </section>

      {problem.screenshot && (
        <section className="problem-screenshot-section" aria-labelledby="problem-screenshot-heading">
          <h2 id="problem-screenshot-heading" className="section-header">Screenshot</h2>
          <div className="screenshot-preview">
            <img src={problem.screenshot} alt={`Screenshot of ${formatProblemTitle(problem)}`} />
          </div>
        </section>
      )}

      <section className="problem-attempts-section" aria-labelledby="problem-attempts-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Progress over time</p>
            <h2 id="problem-attempts-heading" className="section-header">Attempts</h2>
          </div>
          <span className="count-badge">{problemAttempts.length}</span>
        </div>
        <ol className="problem-attempt-list">
          {problemAttempts.map((attempt) => (
            <li key={attempt.id}>
              <button type="button" onClick={() => {
                window.location.hash = `attempt-${encodeURIComponent(attempt.id)}`
              }}>
                <strong>Attempt #{attempt.attemptNumber}</strong>
                <span>{formatDate(attempt.date, { dateStyle: "medium" })}</span>
                <span>{labelForOption(resultOptions, attempt.result)}</span>
                <span>{formatDuration(attempt.timeSpent)}</span>
                <span className="history-arrow" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <button className="secondary-button problem-history-back" type="button" onClick={() => {
        window.location.hash = "history"
      }}>Back to problem history</button>
    </>
  )
}

export default ProblemDetail
