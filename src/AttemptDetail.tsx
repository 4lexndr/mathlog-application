import { useState } from "react"
import type { Attempt, Problem } from "./types.ts"
import { contestStatusOptions, mistakeTypeOptions, resultOptions } from "./types.ts"
import { formatDate, formatDuration, formatProblemTitle, labelForOption } from "./storage.ts"
import SliderInput from "./SliderInput"

interface AttemptDetailProps {
  attemptId: string
  problems: Problem[]
  attempts: Attempt[]
  onUpdate: (attempt: Attempt) => void
  onDelete: (attemptId: string) => void
}

function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
  fallback = "Not recorded",
): string {
  return value ? labelForOption(options, value) : fallback
}

function AttemptDetail({ attemptId, problems, attempts, onUpdate, onDelete }: AttemptDetailProps) {
  const attempt = attempts.find((item) => item.id === attemptId)
  const problem = attempt
    ? problems.find((item) => item.id === attempt.problemId)
    : undefined
  const [isEditing, setIsEditing] = useState(false)
  const [draftAttempt, setDraftAttempt] = useState(attempt)
  const [error, setError] = useState("")
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set())

  if (!attempt || !problem || !draftAttempt) {
    return (
      <>
        <h1 id="page-title">Attempt not found</h1>
        <section className="dashboard-card not-found-card">
          <p>This attempt may have been removed or the link may be incorrect.</p>
          <button className="secondary-button" type="button" onClick={() => {
            window.location.hash = "history"
          }}>Back to problem history</button>
        </section>
      </>
    )
  }

  function clearInvalidField(field: string) {
    setInvalidFields((previous) => {
      const next = new Set(previous)
      next.delete(field)
      return next
    })
  }

  function saveChanges() {
    if (!draftAttempt) return
    const nextInvalidFields = new Set<string>()
    if (!draftAttempt.date) nextInvalidFields.add("edit-attempt-date")
    if (!draftAttempt.result) nextInvalidFields.add("edit-attempt-result")
    if (!Number.isFinite(draftAttempt.timeSpent) || draftAttempt.timeSpent < 1) {
      nextInvalidFields.add("edit-attempt-time")
    }
    if (
      draftAttempt.result
      && draftAttempt.result !== "independent"
      && !draftAttempt.mistakeType
    ) nextInvalidFields.add("edit-attempt-mistake-type")
    if (!draftAttempt.contestStatus) nextInvalidFields.add("edit-attempt-contest-status")

    if (nextInvalidFields.size > 0) {
      setInvalidFields(nextInvalidFields)
      setError("Please correct the highlighted fields before saving this attempt.")
      return
    }

    onUpdate({
      ...draftAttempt,
      mistakeType: draftAttempt.result === "independent" ? "" : draftAttempt.mistakeType,
      keyIdea: draftAttempt.keyIdea.trim(),
      recognitionClue: draftAttempt.recognitionClue.trim(),
    })
    setError("")
    setInvalidFields(new Set())
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <>
        <h1 id="page-title">Edit attempt #{attempt.attemptNumber}</h1>
        <section className="dashboard-card log-panel attempt-edit-panel">
          <h2 className="section-header">Attempt details</h2>
          <div className="form-section log-panel-fields">
            <label className="input-field">
              <span className="input-description">attempt date</span>
              <input
                className={`input-card ${invalidFields.has("edit-attempt-date") ? "input-error" : ""}`}
                aria-invalid={invalidFields.has("edit-attempt-date")}
                type="date"
                value={draftAttempt.date}
                onChange={(event) => {
                  setDraftAttempt({ ...draftAttempt, date: event.target.value })
                  clearInvalidField("edit-attempt-date")
                }}
              />
            </label>
            <label className="input-field">
              <span className="input-description">result</span>
              <select
                className={`input-card ${invalidFields.has("edit-attempt-result") ? "input-error" : ""}`}
                aria-invalid={invalidFields.has("edit-attempt-result")}
                value={draftAttempt.result}
                onChange={(event) => {
                  const nextResult = event.target.value
                  setDraftAttempt({
                    ...draftAttempt,
                    result: nextResult,
                    mistakeType: nextResult === "independent" ? "" : draftAttempt.mistakeType,
                  })
                  clearInvalidField("edit-attempt-result")
                  if (nextResult === "independent") clearInvalidField("edit-attempt-mistake-type")
                }}
              >
                <option value="" disabled>Select a result</option>
                {resultOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <SliderInput
              label="time spent"
              value={draftAttempt.timeSpent}
              valueLabel={`${draftAttempt.timeSpent} min`}
              min={1}
              max={30}
              onChange={(timeSpent) => {
                setDraftAttempt({ ...draftAttempt, timeSpent })
                clearInvalidField("edit-attempt-time")
              }}
            />
            {draftAttempt.result && draftAttempt.result !== "independent" && (
              <label className="input-field">
                <span className="input-description">mistake type</span>
                <select
                  className={`input-card ${invalidFields.has("edit-attempt-mistake-type") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-attempt-mistake-type")}
                  value={draftAttempt.mistakeType}
                  onChange={(event) => {
                    setDraftAttempt({ ...draftAttempt, mistakeType: event.target.value })
                    clearInvalidField("edit-attempt-mistake-type")
                  }}
                >
                  <option value="" disabled>Select a mistake type</option>
                  {mistakeTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}{option.description ? ` — ${option.description}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="input-field">
              <span className="input-description">contest rated or unrated?</span>
              <select
                className={`input-card ${invalidFields.has("edit-attempt-contest-status") ? "input-error" : ""}`}
                aria-invalid={invalidFields.has("edit-attempt-contest-status")}
                value={draftAttempt.contestStatus}
                onChange={(event) => {
                  setDraftAttempt({ ...draftAttempt, contestStatus: event.target.value })
                  clearInvalidField("edit-attempt-contest-status")
                }}
              >
                <option value="" disabled>Select rated or unrated</option>
                {contestStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="input-field">
              <span className="input-description">what I learned</span>
              <textarea
                className="input-card"
                placeholder="A short phrase or sentence you want to remember"
                value={draftAttempt.keyIdea}
                onChange={(event) => {
                  setDraftAttempt({ ...draftAttempt, keyIdea: event.target.value })
                }}
              />
            </label>
            <label className="input-field">
              <span className="input-description">recognition clue</span>
              <textarea
                className="input-card"
                placeholder="What should help you recognize this approach next time?"
                value={draftAttempt.recognitionClue}
                onChange={(event) => {
                  setDraftAttempt({ ...draftAttempt, recognitionClue: event.target.value })
                }}
              />
            </label>
          </div>
        </section>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="edit-log-actions">
          <button className="secondary-button" type="button" onClick={() => {
            setDraftAttempt(attempt)
            setError("")
            setInvalidFields(new Set())
            setIsEditing(false)
          }}>Cancel</button>
          <button className="button-style" type="button" onClick={saveChanges}>Save changes</button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="detail-eyebrow">{formatProblemTitle(problem)}</p>
      <h1 id="page-title">Attempt #{attempt.attemptNumber}</h1>
      <div className="detail-layout">
        <article className="dashboard-card">
          <section className="detail-section" aria-labelledby="attempt-details-heading">
            <h2 id="attempt-details-heading">Attempt details</h2>
            <dl className="detail-grid">
              <div className="detail-item"><dt>Date</dt><dd>{formatDate(attempt.date, { dateStyle: "long" })}</dd></div>
              <div className="detail-item"><dt>Result</dt><dd>{optionLabel(resultOptions, attempt.result)}</dd></div>
              <div className="detail-item"><dt>Time spent</dt><dd>{formatDuration(attempt.timeSpent)}</dd></div>
              {attempt.result !== "independent" && (
                <div className="detail-item"><dt>What went wrong</dt><dd>{optionLabel(mistakeTypeOptions, attempt.mistakeType, "None recorded")}</dd></div>
              )}
              <div className="detail-item"><dt>Contest status</dt><dd>{optionLabel(contestStatusOptions, attempt.contestStatus)}</dd></div>
            </dl>
          </section>
          <section className="detail-section" aria-labelledby="reflection-heading">
            <h2 id="reflection-heading">Learning</h2>
            <dl className="detail-grid">
              <div className="detail-item wide-field"><dt>What I learned</dt><dd>{attempt.keyIdea || "Not recorded"}</dd></div>
              <div className="detail-item wide-field"><dt>Recognition clue</dt><dd>{attempt.recognitionClue || "Not recorded"}</dd></div>
            </dl>
          </section>
        </article>
        <aside className="dashboard-card attempt-context-card">
          <p className="section-kicker">Problem</p>
          <h2>{formatProblemTitle(problem)}</h2>
          <p>{problem.numAttempts} {problem.numAttempts === 1 ? "attempt" : "attempts"} recorded</p>
          <div className="form-actions log-detail-actions">
            <button className="secondary-button" type="button" onClick={() => {
              window.location.hash = `problem-${encodeURIComponent(problem.id)}`
            }}>Back to problem</button>
            <button className="secondary-button" type="button" onClick={() => {
              setDraftAttempt(attempt)
              setIsEditing(true)
            }}>Edit attempt</button>
            <button className="danger-button" type="button" onClick={() => {
              if (window.confirm("Delete this attempt? This action cannot be undone.")) {
                onDelete(attempt.id)
              }
            }}>Delete attempt</button>
          </div>
        </aside>
      </div>
    </>
  )
}

export default AttemptDetail
