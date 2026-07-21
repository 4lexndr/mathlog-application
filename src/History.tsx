import { useMemo, useState } from "react"
import type { Attempt, Contest, Problem } from "./types.ts"
import { resultOptions } from "./types.ts"
import {
  formatDate,
  formatContestTitle,
  formatProblemTitle,
  labelForOption,
} from "./storage.ts"

interface HistoryProps {
  problems: Problem[]
  attempts: Attempt[]
  contests: Contest[]
}

interface ContestHistoryCardProps {
  contests: Contest[]
  isSearching: boolean
}

interface HistoryCardProps {
  headingId: string
  title: string
  emptyTitle: string
  emptyDescription: string
  attempts: Attempt[]
  problemById: ReadonlyMap<string, Problem>
}

const HISTORY_LIMIT = 50

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function HistoryCard({
  headingId,
  title,
  emptyTitle,
  emptyDescription,
  attempts,
  problemById,
}: HistoryCardProps) {
  return (
    <section className="dashboard-card" aria-labelledby={headingId}>
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Newest first</p>
          <h2 id={headingId} className="section-header">{title}</h2>
        </div>
        <span
          className="count-badge"
          aria-label={`${attempts.length} ${attempts.length === 1 ? "attempt" : "attempts"} shown`}
        >
          {attempts.length}
        </span>
      </div>

      {attempts.length === 0 ? (
        <div className="empty-state">
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        <div
          className="problem-list scroll-list history-problem-list"
          role="region"
          aria-labelledby={headingId}
          tabIndex={0}
        >
          {attempts.map((attempt) => {
            const problem = problemById.get(attempt.problemId)
            const result = labelForOption(resultOptions, attempt.result)

            return (
              <button
                key={attempt.id}
                className="problem-card problem-card-button"
                type="button"
                onClick={() => {
                  window.location.hash = encodeURIComponent(attempt.id)
                }}
              >
                <div className="problem-card-copy">
                  <h3>{problem ? formatProblemTitle(problem) : "Unknown problem"}</h3>
                  <div className="problem-meta">
                    <span>{formatDate(attempt.date, { dateStyle: "medium" })}</span>
                    <span>{result}</span>
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

function ContestHistoryCard({ contests, isSearching }: ContestHistoryCardProps) {
  return (
    <section className="dashboard-card contest-history-card" aria-labelledby="contest-history-heading">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Newest first</p>
          <h2 id="contest-history-heading" className="section-header">Contest logs</h2>
        </div>
        <span
          className="count-badge"
          aria-label={`${contests.length} ${contests.length === 1 ? "contest" : "contests"} shown`}
        >
          {contests.length}
        </span>
      </div>

      {contests.length === 0 ? (
        <div className="empty-state contest-history-empty">
          <h3>{isSearching ? "No matching contests" : "No contest logs yet"}</h3>
          <p>{isSearching
            ? "Try another year, contest, or subcontest."
            : "Complete contest logs will appear here, with the most recent first."}</p>
        </div>
      ) : (
        <div
          className="contest-history-list scroll-list"
          role="region"
          aria-labelledby="contest-history-heading"
          tabIndex={0}
        >
          {contests.map((contest) => (
            <button
              key={contest.id}
              className="contest-history-row"
              type="button"
              onClick={() => {
                window.location.hash = `contest-${encodeURIComponent(contest.id)}`
              }}
            >
              <strong>{formatContestTitle(contest)}</strong>
              <span>{formatDate(contest.date, { dateStyle: "medium" })}</span>
              <span className="contest-history-score">Score: {contest.score}</span>
              <span className="history-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function History({ problems, attempts, contests }: HistoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { problemById, searchTextByProblemId } = useMemo(() => {
    const nextProblemById = new Map<string, Problem>()
    const nextSearchTextByProblemId = new Map<string, string>()

    for (const problem of problems) {
      nextProblemById.set(problem.id, problem)
      nextSearchTextByProblemId.set(problem.id, normalizeSearchValue([
        problem.year,
        problem.contest,
        problem.subcontest,
        problem.problemNumber,
      ].join(" ")))
    }

    return {
      problemById: nextProblemById,
      searchTextByProblemId: nextSearchTextByProblemId,
    }
  }, [problems])
  const newestFirst = useMemo(() => [...attempts].sort((first, second) => {
    const dateOrder = second.date.localeCompare(first.date)
    return dateOrder || second.id.localeCompare(first.id)
  }), [attempts])
  const newestContestsFirst = useMemo(() => [...contests].sort((first, second) => {
    const dateOrder = second.date.localeCompare(first.date)
    return dateOrder || second.id.localeCompare(first.id)
  }), [contests])
  const searchTerms = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchQuery)
    return normalizedQuery ? normalizedQuery.split(/\s+/) : []
  }, [searchQuery])
  const { initialAttempts, reviewAttempts } = useMemo(() => {
    const nextInitialAttempts: Attempt[] = []
    const nextReviewAttempts: Attempt[] = []

    for (const attempt of newestFirst) {
      const searchText = searchTextByProblemId.get(attempt.problemId) ?? ""
      if (searchTerms.some((term) => !searchText.includes(term))) continue

      const targetAttempts = attempt.isReview ? nextReviewAttempts : nextInitialAttempts
      if (targetAttempts.length < HISTORY_LIMIT) targetAttempts.push(attempt)

      if (
        nextInitialAttempts.length === HISTORY_LIMIT
        && nextReviewAttempts.length === HISTORY_LIMIT
      ) break
    }

    return {
      initialAttempts: nextInitialAttempts,
      reviewAttempts: nextReviewAttempts,
    }
  }, [newestFirst, searchTerms, searchTextByProblemId])
  const visibleContests = useMemo(() => newestContestsFirst.filter((contest) => {
    const searchText = normalizeSearchValue([
      contest.year,
      contest.contest,
      contest.subcontest,
    ].join(" "))
    return searchTerms.every((term) => searchText.includes(term))
  }).slice(0, HISTORY_LIMIT), [newestContestsFirst, searchTerms])
  const isSearching = searchTerms.length > 0

  return (
    <>
      <h1 id="page-title">Log history</h1>

      <search className="history-search" aria-label="Search log history">
        <label htmlFor="history-search-input" className="input-description">
          Search logs
        </label>
        <input
          id="history-search-input"
          className="input-card"
          type="search"
          placeholder="Year, contest, subcontest, or problem number"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value)
          }}
        />
      </search>

      <div className="history-layout">
        <HistoryCard
          headingId="history-heading"
          title="Previous attempts"
          emptyTitle={isSearching ? "No matching attempts" : "No attempts yet"}
          emptyDescription={isSearching
            ? "Try another year, contest, subcontest, or problem number."
            : "Completed logs will appear here, with the most recent attempt first."}
          attempts={initialAttempts}
          problemById={problemById}
        />
        <HistoryCard
          headingId="review-history-heading"
          title="Reviews"
          emptyTitle={isSearching ? "No matching reviews" : "No reviews yet"}
          emptyDescription={isSearching
            ? "Try another year, contest, subcontest, or problem number."
            : "Completed review logs will appear here."}
          attempts={reviewAttempts}
          problemById={problemById}
        />
      </div>

      <ContestHistoryCard contests={visibleContests} isSearching={isSearching} />
    </>
  )
}

export default History
