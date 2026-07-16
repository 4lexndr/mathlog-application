import type { Attempt, Problem } from "./types.ts"
import { formatProblemTitle } from "./storage.ts"

interface JournalProps {
  problems: Problem[]
  attempts: Attempt[]
}

function Journal({ problems, attempts }: JournalProps) {
  const problemById = new Map(problems.map((problem) => [problem.id, problem]))

  // Only reflections with actual text belong in the learning journal.
  const entries = attempts
    .filter((attempt) => attempt.keyIdea?.trim())
    .sort((first, second) => {
      const dateOrder = second.date.localeCompare(first.date)
      return dateOrder || second.id.localeCompare(first.id)
    })

  return (
    <>
      <h1 id="page-title">Learning journal</h1>

      <section className="dashboard-card" aria-labelledby="journal-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Things to remember</p>
            <h2 id="journal-heading" className="section-header">What I learned</h2>
          </div>
          <span
            className="count-badge"
            aria-label={`${entries.length} journal ${entries.length === 1 ? "entry" : "entries"}`}
          >
            {entries.length}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="empty-state">
            <h3>Your journal is empty</h3>
            <p>Add a short lesson when logging a problem and it will appear here.</p>
          </div>
        ) : (
          <ul className="journal-list">
            {entries.map((attempt) => {
              const problem = problemById.get(attempt.problemId)

              return (
                <li key={attempt.id} className="journal-entry">
                  <p>{attempt.keyIdea}</p>
                  <span>{problem ? formatProblemTitle(problem) : "Unknown problem"}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}

export default Journal
