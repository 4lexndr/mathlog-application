import type { Attempt } from "./types.ts"
import { formatDate, getPreviousWeekStats } from "./storage.ts"

interface WeeklyReviewProps {
  attempts: Attempt[]
}

function WeeklyReview({ attempts }: WeeklyReviewProps) {
  // The current week remains in progress, so summarize the last complete one.
  const stats = getPreviousWeekStats(attempts)

  return (
    <>
      <h1 id="page-title">Weekly review</h1>

      <section className="dashboard-card weekly-review-card" aria-labelledby="weekly-review-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Previous week</p>
            <h2 id="weekly-review-heading" className="section-header">
              {formatDate(stats.startDate, { month: "short", day: "numeric" })}–
              {formatDate(stats.endDate, { month: "short", day: "numeric" })}
            </h2>
          </div>
        </div>

        <div className="weekly-review-stats">
          <div className="weekly-review-stat">
            <span className="weekly-review-value">{stats.problemsAttempted}</span>
            <strong>problems attempted</strong>
          </div>
          <div className="weekly-review-stat">
            <span className="weekly-review-value">{stats.reviewsAttempted}</span>
            <strong>reviews attempted</strong>
          </div>
          <div className="weekly-review-stat">
            <span className="weekly-review-value">{stats.topicsLearned}</span>
            <strong>new topics learned</strong>
          </div>
          <div className="weekly-review-stat">
            <span className="weekly-review-value">{stats.independentPercentage}%</span>
            <strong>solved independently</strong>
          </div>
          <div className="weekly-review-stat">
            <span className="weekly-review-value">{stats.tinyHintPercentage}%</span>
            <strong>solved with a small hint</strong>
          </div>
        </div>

        {stats.problemsAttempted === 0 && (
          <p className="performance-note">No attempts were logged during this week.</p>
        )}
      </section>
    </>
  )
}

export default WeeklyReview
