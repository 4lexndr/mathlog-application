import type { Attempt, Problem } from "./types.ts"
import { mistakeTypeOptions, subjectOptions } from "./types.ts"
import {
  addCalendarDays,
  describeDueDate,
  formatProblemTitle,
  getDueProblems,
  getSevenDayPerformance,
  labelForOption,
  localDateKey,
} from "./storage.ts"

interface DashboardProps {
  problems: Problem[]
  attempts: Attempt[]
}

function Dashboard({ problems, attempts }: DashboardProps) {
  const today = new Date()
  const todayKey = localDateKey(today)
  const dueProblems = getDueProblems(problems, attempts, today)
  const performance = getSevenDayPerformance(attempts, today)
  const problemById = new Map(problems.map((problem) => [problem.id, problem]))

  // Dashboard insights use a rolling window that includes today.
  const sevenDayStart = addCalendarDays(today, -6)
  const recentAttempts = attempts.filter((attempt) => {
    const attemptDate = localDateKey(attempt.date)
    return attemptDate >= sevenDayStart && attemptDate <= todayKey
  })
  const mistakeCounts = new Map<string, number>()

  for (const attempt of recentAttempts) {
    if (!attempt.result || attempt.result === "independent" || !attempt.mistakeType) continue
    mistakeCounts.set(attempt.mistakeType, (mistakeCounts.get(attempt.mistakeType) ?? 0) + 1)
  }

  const topMistake = [...mistakeCounts.entries()]
    .map(([value, count]) => ({
      count,
      label: labelForOption(mistakeTypeOptions, value),
    }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))[0]
  const countsBySubject = new Map(subjectOptions.map((option) => [option.value, 0]))
  let otherSubjectCount = 0

  // Count attempts so the chart reflects practice volume, including reviews.
  for (const attempt of attempts) {
    const problem = problemById.get(attempt.problemId)
    if (!problem) continue

    const currentCount = countsBySubject.get(problem.subject)
    if (currentCount === undefined) {
      otherSubjectCount += 1
    } else {
      countsBySubject.set(problem.subject, currentCount + 1)
    }
  }

  const subjectDistribution = subjectOptions.map((option) => ({
    label: option.label,
    value: countsBySubject.get(option.value) ?? 0,
  }))
  if (otherSubjectCount > 0) {
    subjectDistribution.push({ label: "Other", value: otherSubjectCount })
  }

  const categorizedAttempts = subjectDistribution.reduce((total, subject) => total + subject.value, 0)
  const largestSubjectCount = Math.max(0, ...subjectDistribution.map((subject) => subject.value))

  return (
    <>
      <h1 id="page-title">Welcome back, Alexander</h1>

      <div id="main-panel">
        <section className="dashboard-card" aria-labelledby="due-heading">
          <div className="section-heading-row">
            <h2 id="due-heading" className="section-header">Problems due today</h2>
            <span
              className="count-badge"
              aria-label={`${dueProblems.length} ${dueProblems.length === 1 ? "problem" : "problems"} due`}
            >
              {dueProblems.length}
            </span>
          </div>

          {dueProblems.length === 0 ? (
            <div className="empty-state">
              <h3>You&apos;re all caught up</h3>
              <p>Previously attempted problems will appear here when they&apos;re ready to revisit.</p>
            </div>
          ) : (
            <div className="problem-list">
              {dueProblems.map(({ problem, attempt, dueDate }) => {
                const isOverdue = dueDate < todayKey

                return (
                  <button
                    key={attempt.id}
                    className="problem-card problem-card-button"
                    type="button"
                    onClick={() => {
                      window.location.hash = `log/${encodeURIComponent(problem.id)}`
                    }}
                  >
                    <div className="problem-card-copy">
                      <h3>{formatProblemTitle(problem)}</h3>
                      <div className="problem-meta">
                        <span>{labelForOption(subjectOptions, problem.subject)}</span>
                        <span>{problem.rating} rating</span>
                      </div>
                    </div>
                    <span className={`due-status${isOverdue ? " overdue" : ""}`}>
                      {describeDueDate(dueDate, today)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="dashboard-card" aria-labelledby="performance-heading">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Last 7 days</p>
              <h2 id="performance-heading" className="section-header">Recent performance</h2>
            </div>
          </div>

          <div className="weekly-summary">
            <span className="weekly-total">{performance.total}</span>
            <div>
              <strong>problems solved</strong>
              <p>with little or no assistance</p>
            </div>
          </div>

          <div className="stat-list">
            <div className="stat-row">
              <div className="stat-label">
                <strong>Independently</strong>
                <span>No hints needed</span>
              </div>
              <span className="stat-value">{performance.independent}</span>
            </div>

            <div className="stat-row">
              <div className="stat-label">
                <strong>Small hint</strong>
                <span>A light nudge</span>
              </div>
              <span className="stat-value">{performance.tinyHint}</span>
            </div>
          </div>

          {performance.total === 0 && (
            <p className="performance-note">Complete a problem to start this week&apos;s snapshot.</p>
          )}
        </section>

        <section className="dashboard-card insight-card" aria-labelledby="mistakes-heading">
          <div>
            <p className="section-kicker">Last 7 days</p>
            <h2 id="mistakes-heading" className="section-header">What keeps going wrong?</h2>
          </div>

          {topMistake ? (
            <div className="insight-answer">
              <strong>{topMistake.label}</strong>
              <p>
                Your most frequent recorded mistake, appearing {topMistake.count}{" "}
                {topMistake.count === 1 ? "time" : "times"}.
              </p>
            </div>
          ) : (
            <div className="insight-answer insight-empty">
              <strong>No recurring mistake yet</strong>
              <p>Record mistake types in your attempts to reveal a pattern.</p>
            </div>
          )}
        </section>

        <section className="dashboard-card subject-distribution-card" aria-labelledby="subjects-heading">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">All attempts</p>
              <h2 id="subjects-heading" className="section-header">Subject distribution</h2>
            </div>
            <span
              className="count-badge"
              aria-label={`${categorizedAttempts} categorized ${categorizedAttempts === 1 ? "attempt" : "attempts"}`}
            >
              {categorizedAttempts}
            </span>
          </div>

          <div className="subject-chart" role="list" aria-label="Attempts by subject">
            {subjectDistribution.map((subject) => {
              const width = largestSubjectCount === 0
                ? 0
                : (subject.value / largestSubjectCount) * 100

              return (
                <div
                  key={subject.label}
                  className="subject-bar-row"
                  role="listitem"
                  aria-label={`${subject.label}: ${subject.value} ${subject.value === 1 ? "attempt" : "attempts"}`}
                >
                  <div className="subject-bar-heading" aria-hidden="true">
                    <span>{subject.label}</span>
                    <strong>{subject.value}</strong>
                  </div>
                  <div className="subject-bar-track" aria-hidden="true">
                    <span className="subject-bar-fill" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {categorizedAttempts === 0 && (
            <p className="performance-note">Log an attempt to start building your subject profile.</p>
          )}
        </section>
      </div>
    </>
  )
}

export default Dashboard
