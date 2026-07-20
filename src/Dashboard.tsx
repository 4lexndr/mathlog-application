import type { Attempt, Problem } from "./types.ts"
import { mistakeTypeOptions, subjectOptions } from "./types.ts"
import {
  addCalendarDays,
  getSevenDayPerformance,
  labelForOption,
  localDateKey,
} from "./storage.ts"

interface DashboardProps {
  problems: Problem[]
  attempts: Attempt[]
}

const dashboardGreetings = [
  "Welcome back, Alexander",
  "Ready for another problem?",
  "What will you solve today?",
  "Let’s sharpen the toolkit",
  "Keep the momentum going",
  "Time to make progress",
  "Let’s find the key idea",
  "Another day, another insight",
  "Ready for the next challenge?",
]

const dashboardGreeting = dashboardGreetings[
  Math.floor(Math.random() * dashboardGreetings.length)
]

function Dashboard({ problems, attempts }: DashboardProps) {
  const today = new Date()
  const todayKey = localDateKey(today)
  const performance = getSevenDayPerformance(attempts, today)
  const dueProblems = problems.filter((problem) => problem.reviewDate <= todayKey)
  const dueProblemIds = new Set(dueProblems.map((problem) => problem.id))
  const estimatedReviewMinutes = attempts
    .filter((attempt) => !attempt.isReview && dueProblemIds.has(attempt.problemId))
    .reduce((total, attempt) => total + attempt.timeSpent, 0)
  const averageDueRating = dueProblems.length === 0
    ? null
    : Math.round(
      dueProblems.reduce((total, problem) => total + problem.rating, 0) / dueProblems.length,
    )

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

  const topMistakes = [...mistakeCounts.entries()]
    .map(([value, count]) => ({
      count,
      label: labelForOption(mistakeTypeOptions, value),
    }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
    .slice(0, 3)
  const countsBySubject = new Map(subjectOptions.map((option) => [option.value, 0]))
  let otherSubjectCount = 0

  for (const problem of problems) {
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

  const categorizedProblems = subjectDistribution.reduce((total, subject) => total + subject.value, 0)

  return (
    <>
      <h1 id="page-title">{dashboardGreeting}</h1>

      <div id="main-panel">
        <div className="dashboard-row dashboard-top-row">
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

          <section className="dashboard-card upcoming-card" aria-labelledby="upcoming-heading">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Review queue</p>
              <h2 id="upcoming-heading" className="section-header">Upcoming problems</h2>
            </div>
            <span
              className="count-badge"
              aria-label={`${dueProblems.length} ${dueProblems.length === 1 ? "problem" : "problems"} due today`}
            >
              {dueProblems.length}
            </span>
          </div>

          <div className="weekly-summary">
            <span className="weekly-total">{dueProblems.length}</span>
            <div>
              <strong>{dueProblems.length === 1 ? "problem" : "problems"} due today</strong>
              <p>including anything overdue</p>
            </div>
          </div>

          <div className="stat-list">
            <div className="stat-row">
              <div className="stat-label">
                <strong>Average rating</strong>
                <span>Across today&apos;s review queue</span>
              </div>
              <span className="stat-value">{averageDueRating ?? "—"}</span>
            </div>

            <div className="stat-row">
              <div className="stat-label">
                <strong>Estimated time</strong>
                <span>Based on initial attempts</span>
              </div>
              <span className="stat-value">{estimatedReviewMinutes} min</span>
            </div>
          </div>

          {dueProblems.length === 0 && (
            <p className="performance-note">No problems are ready for review today.</p>
          )}
          <a className="see-more-link" href="#queue">See more</a>
          </section>
        </div>

        <div className="dashboard-row dashboard-bottom-row">
          <section className="dashboard-card insight-card" aria-labelledby="mistakes-heading">
          <div>
            <p className="section-kicker">Last 7 days</p>
            <h2 id="mistakes-heading" className="section-header">What keeps going wrong?</h2>
          </div>

          {topMistakes.length > 0 ? (
            <div className="mistake-ranking" role="list" aria-label="Most frequent mistakes">
              {topMistakes.map((mistake, index) => (
                <div className="mistake-contender" key={mistake.label} role="listitem">
                  <span>#{index + 1}</span>
                  <strong>{mistake.label}</strong>
                  <p>
                    {mistake.count} {mistake.count === 1 ? "occurrence" : "occurrences"}
                  </p>
                </div>
              ))}
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
              <p className="section-kicker">All problems</p>
              <h2 id="subjects-heading" className="section-header">Subject distribution</h2>
            </div>
            <span
              className="count-badge"
              aria-label={`${categorizedProblems} categorized ${categorizedProblems === 1 ? "problem" : "problems"}`}
            >
              {categorizedProblems}
            </span>
          </div>

          <div
            className="subject-chart scroll-list subject-scroll-list"
            role="list"
            aria-label="Problems by subject"
            tabIndex={0}
          >
            {subjectDistribution.map((subject) => {
              const percentage = categorizedProblems === 0
                ? 0
                : (subject.value / categorizedProblems) * 100
              const barColor = `hsl(38 65% ${78 - percentage * 0.35}%)`

              return (
                <div
                  key={subject.label}
                  className="subject-bar-row"
                  role="listitem"
                  aria-label={`${subject.label}: ${subject.value} ${subject.value === 1 ? "problem" : "problems"}`}
                >
                  <div className="subject-bar-heading" aria-hidden="true">
                    <span>{subject.label}</span>
                    <strong>{subject.value}</strong>
                  </div>
                  <div className="subject-bar-track" aria-hidden="true">
                    <span
                      className="subject-bar-fill"
                      style={{ width: `${percentage}%`, background: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {categorizedProblems === 0 && (
            <p className="performance-note">Log a problem to start building your subject profile.</p>
          )}
          </section>
        </div>
      </div>
    </>
  )
}

export default Dashboard
