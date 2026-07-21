import type { Contest } from "./types.ts"
import { formatContestTitle, formatDate } from "./storage.ts"

interface ContestDetailProps {
  contestId: string
  contests: Contest[]
}

function ContestDetail({ contestId, contests }: ContestDetailProps) {
  const contest = contests.find((item) => item.id === contestId)

  if (!contest) {
    return (
      <>
        <h1 id="page-title">Contest not found</h1>
        <section className="dashboard-card not-found-card">
          <p>This contest log may have been removed or the link may be incorrect.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              window.location.hash = "history"
            }}
          >
            Back to history
          </button>
        </section>
      </>
    )
  }

  return (
    <>
      <h1 id="page-title">{formatContestTitle(contest)}</h1>

      <article className="dashboard-card contest-detail-card">
        <section className="detail-section" aria-labelledby="contest-details-heading">
          <h2 id="contest-details-heading">Contest result</h2>
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
        </section>

        <div className="form-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              window.location.hash = "history"
            }}
          >
            Back to history
          </button>
        </div>
      </article>
    </>
  )
}

export default ContestDetail
