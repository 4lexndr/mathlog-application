import type { Problem } from "./types.ts"
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
  onSnoozeAll: (problemIds: string[]) => void
}

interface QueueSectionProps {
  description: string
  headingId: string
  problems: Problem[]
  title: string
}

function QueueSection({ description, headingId, problems, title }: QueueSectionProps) {
  return (
    <section className="queue-section" aria-labelledby={headingId}>
      <div className="queue-section-heading">
        <div>
          <p className="section-kicker">{description}</p>
          <h2 id={headingId}>{title}</h2>
        </div>
        <span className="count-badge" aria-label={`${problems.length} problems`}>
          {problems.length}
        </span>
      </div>
      {problems.length === 0 ? (
        <p className="queue-empty-state">No problems in this group.</p>
      ) : (
        <ul className="queue-problem-list">
          {problems.map((problem) => (
            <li key={problem.id}>
              <button type="button" onClick={() => {
                window.location.hash = `problem-${encodeURIComponent(problem.id)}`
              }}>
                <strong>{formatProblemTitle(problem)}</strong>
                <span>Due {formatDate(problem.reviewDate, { dateStyle: "medium" })}</span>
                <span>{labelForOption(subjectOptions, problem.subject)}</span>
                <span>Rating {problem.rating}</span>
                <span className="history-arrow" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Queue({ problems, onSnoozeAll }: QueueProps) {
  const today = localDateKey()
  const weekEnd = addCalendarDays(today, 7)
  const visibleProblems = problems
    .filter((problem) => problem.reviewDate && problem.reviewDate <= weekEnd)
    .sort((first, second) => (
      first.reviewDate.localeCompare(second.reviewDate)
      || formatProblemTitle(first).localeCompare(formatProblemTitle(second))
    ))
  const overdueProblems = visibleProblems.filter((problem) => problem.reviewDate < today)
  const todayProblems = visibleProblems.filter((problem) => problem.reviewDate === today)
  const upcomingProblems = visibleProblems.filter((problem) => problem.reviewDate > today)
  const snoozableProblems = [...overdueProblems, ...todayProblems]

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
            disabled={snoozableProblems.length === 0}
            onClick={() => { onSnoozeAll(snoozableProblems.map((problem) => problem.id)) }}
          >Snooze All</button>
          <span>Moves overdue and today&apos;s problems to tomorrow.</span>
        </div>
      </div>
      <div className="queue-layout">
        <QueueSection description="Before today" headingId="overdue-heading" problems={overdueProblems} title="Overdue" />
        <QueueSection description="Due today" headingId="today-heading" problems={todayProblems} title="Today" />
        <QueueSection description="Next 7 days" headingId="upcoming-heading" problems={upcomingProblems} title="Upcoming" />
      </div>
    </>
  )
}

export default Queue
