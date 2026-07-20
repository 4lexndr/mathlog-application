import type { Attempt, Problem } from "./types.ts"
import { subjectOptions } from "./types.ts"
import {
  addCalendarDays,
  formatDate,
  formatProblemTitle,
  labelForOption,
  localDateKey,
} from "./storage.ts"

interface QueueProps {
  problems: Problem[]
  attempts: Attempt[]
  onSnoozeAll: (problemIds: string[]) => void
}

interface QueueSectionProps {
  description: string
  headingId: string
  problems: Problem[]
  title: string
  attemptIdByProblem: ReadonlyMap<string, string>
}

function QueueSection({
  description,
  headingId,
  problems,
  title,
  attemptIdByProblem,
}: QueueSectionProps) {
  return (
    <section className="dashboard-card queue-section" aria-labelledby={headingId}>
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">{description}</p>
          <h2 id={headingId} className="section-header">{title}</h2>
        </div>
        <span
          className="count-badge"
          aria-label={`${problems.length} ${problems.length === 1 ? "problem" : "problems"}`}
        >
          {problems.length}
        </span>
      </div>

      {problems.length === 0 ? (
        <div className="empty-state queue-empty-state">
          <p>No problems in this group.</p>
        </div>
      ) : (
        <div
          className="problem-list scroll-list queue-problem-list"
          role="region"
          aria-labelledby={headingId}
          tabIndex={0}
        >
          {problems.map((problem) => {
            const attemptId = attemptIdByProblem.get(problem.id)

            return (
              <button
                key={problem.id}
                className="problem-card problem-card-button"
                type="button"
                disabled={!attemptId}
                onClick={() => {
                  if (attemptId) window.location.hash = encodeURIComponent(attemptId)
                }}
              >
                <div className="problem-card-copy">
                  <h3>{formatProblemTitle(problem)}</h3>
                  <div className="problem-meta">
                    <span>Due {formatDate(problem.reviewDate, { dateStyle: "medium" })}</span>
                    <span>{labelForOption(subjectOptions, problem.subject)}</span>
                    <span>Rating {problem.rating}</span>
                  </div>
                </div>
                <span className="history-arrow" aria-hidden="true">›</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Queue({ problems, attempts, onSnoozeAll }: QueueProps) {
  const today = localDateKey()
  const weekEnd = addCalendarDays(today, 7)
  const visibleProblems = problems
    .filter((problem) => problem.reviewDate && problem.reviewDate <= weekEnd)
    .sort((first, second) => (
      first.reviewDate.localeCompare(second.reviewDate)
      || formatProblemTitle(first).localeCompare(formatProblemTitle(second))
    ))
  const overdueProblems = visibleProblems.filter((problem) => problem.reviewDate < today)
  const upcomingProblems = visibleProblems.filter((problem) => problem.reviewDate === today)
  const comingSoonProblems = visibleProblems.filter((problem) => problem.reviewDate > today)
  const attemptIdByProblem = new Map<string, string>()

  for (const attempt of attempts) {
    if (!attempt.isReview && !attemptIdByProblem.has(attempt.problemId)) {
      attemptIdByProblem.set(attempt.problemId, attempt.id)
    }
  }

  return (
    <>
      <div className="queue-page-heading">
        <div>
          <h1 id="page-title">Review queue</h1>
          <p>Problems scheduled through the next seven days.</p>
        </div>
        <div className="queue-snooze-action">
          <button
            className="danger-button"
            type="button"
            disabled={upcomingProblems.length === 0}
            onClick={() => {
              onSnoozeAll(upcomingProblems.map((problem) => problem.id))
            }}
          >
            Snooze All Due Today
          </button>
          <span>Moves only today&apos;s problems to tomorrow.</span>
        </div>
      </div>

      <div className="queue-layout">
        <QueueSection
          description="Before today"
          headingId="overdue-heading"
          problems={overdueProblems}
          title="Overdue"
          attemptIdByProblem={attemptIdByProblem}
        />
        <QueueSection
          description="Due today"
          headingId="upcoming-queue-heading"
          problems={upcomingProblems}
          title="Upcoming"
          attemptIdByProblem={attemptIdByProblem}
        />
        <QueueSection
          description="Next 7 days"
          headingId="coming-soon-heading"
          problems={comingSoonProblems}
          title="Coming soon"
          attemptIdByProblem={attemptIdByProblem}
        />
      </div>
    </>
  )
}

export default Queue
