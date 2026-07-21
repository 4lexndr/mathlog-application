import { useState } from "react"
import type { Contest } from "./types.ts"
import { formatContestTitle, formatDate } from "./storage.ts"

interface ContestDetailProps {
  contestId: string
  contests: Contest[]
  onUpdate: (contest: Contest) => void
  onDelete: (contestId: string) => void
}

function ContestDetail({ contestId, contests, onUpdate, onDelete }: ContestDetailProps) {
  const contest = contests.find((item) => item.id === contestId)

  if (!contest) {
    return (
      <>
        <h1 id="page-title">Contest not found</h1>
        <section className="dashboard-card not-found-card">
          <p>This contest log may have been removed or the link may be incorrect.</p>
          <button className="secondary-button" type="button" onClick={() => {
            window.location.hash = "history"
          }}>Back to history</button>
        </section>
      </>
    )
  }

  return (
    <ContestDetailContent
      key={contest.id}
      contest={contest}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  )
}

function ContestDetailContent({
  contest,
  onUpdate,
  onDelete,
}: {
  contest: Contest
  onUpdate: (contest: Contest) => void
  onDelete: (contestId: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(contest)
  const [score, setScore] = useState(String(contest.score))
  const [error, setError] = useState("")
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set())

  function saveChanges() {
    const parsedScore = Number(score)
    const nextInvalidFields = new Set<string>()
    if (!draft.year.trim()) nextInvalidFields.add("edit-contest-year")
    if (!draft.contest.trim()) nextInvalidFields.add("edit-contest-name")
    if (!draft.date) nextInvalidFields.add("edit-contest-date")
    if (score.trim() === "" || !Number.isFinite(parsedScore) || parsedScore < 0) {
      nextInvalidFields.add("edit-contest-score")
    }

    if (nextInvalidFields.size > 0) {
      setInvalidFields(nextInvalidFields)
      setError("Please correct the highlighted fields before saving this log.")
      return
    }

    onUpdate({
      ...draft,
      year: draft.year.trim(),
      contest: draft.contest.trim().toUpperCase(),
      subcontest: draft.subcontest.trim(),
      score: parsedScore,
    })
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

  function cancelEditing() {
    setDraft(contest)
    setScore(String(contest.score))
    setError("")
    setInvalidFields(new Set())
    setIsEditing(false)
  }

  function deleteLog() {
    if (!window.confirm("Delete this contest log? This action cannot be undone.")) return
    onDelete(contest.id)
  }

  return (
    <>
      <h1 id="page-title">{isEditing ? "Edit contest log" : formatContestTitle(contest)}</h1>

      <article className="dashboard-card contest-detail-card">
        <section className="detail-section" aria-labelledby="contest-details-heading">
          <h2 id="contest-details-heading">Contest result</h2>
          {isEditing ? (
            <div className="contest-log-fields">
              <label className="input-field">
                <span className="input-description">year</span>
                <input
                  className={`input-card ${invalidFields.has("edit-contest-year") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-contest-year")}
                  value={draft.year} onChange={(event) => {
                  setDraft({ ...draft, year: event.target.value })
                  clearInvalidField("edit-contest-year")
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">contest</span>
                <input
                  className={`input-card ${invalidFields.has("edit-contest-name") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-contest-name")}
                  value={draft.contest} onChange={(event) => {
                  setDraft({ ...draft, contest: event.target.value.toUpperCase() })
                  clearInvalidField("edit-contest-name")
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">subcontest (optional)</span>
                <input className="input-card" value={draft.subcontest} onChange={(event) => {
                  setDraft({ ...draft, subcontest: event.target.value })
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">contest date</span>
                <input
                  className={`input-card ${invalidFields.has("edit-contest-date") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-contest-date")}
                  type="date" value={draft.date} onChange={(event) => {
                  setDraft({ ...draft, date: event.target.value })
                  clearInvalidField("edit-contest-date")
                }} />
              </label>
              <label className="input-field">
                <span className="input-description">score</span>
                <input
                  className={`input-card ${invalidFields.has("edit-contest-score") ? "input-error" : ""}`}
                  aria-invalid={invalidFields.has("edit-contest-score")}
                  type="number" min="0" step="any" value={score}
                  onChange={(event) => {
                    setScore(event.target.value)
                    clearInvalidField("edit-contest-score")
                  }} />
              </label>
            </div>
          ) : (
            <dl className="detail-grid">
              <div className="detail-item">
                <dt>Date</dt>
                <dd>{formatDate(contest.date, { dateStyle: "long" })}</dd>
              </div>
              <div className="detail-item">
                <dt>Score</dt>
                <dd>{contest.score}</dd>
              </div>
            </dl>
          )}
        </section>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions log-detail-actions">
          {isEditing ? (
            <>
              <button className="secondary-button" type="button" onClick={cancelEditing}>Cancel</button>
              <button className="button-style" type="button" onClick={saveChanges}>Save changes</button>
            </>
          ) : (
            <>
              <button className="secondary-button" type="button" onClick={() => {
                window.location.hash = "history"
              }}>Back to history</button>
              <button className="secondary-button" type="button" onClick={() => {
                setDraft(contest)
                setScore(String(contest.score))
                setInvalidFields(new Set())
                setIsEditing(true)
              }}>Edit log</button>
              <button className="danger-button" type="button" onClick={deleteLog}>Delete log</button>
            </>
          )}
        </div>
      </article>
    </>
  )
}

export default ContestDetail
