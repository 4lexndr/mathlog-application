import { useMemo, useState } from "react"
import type { Attempt, Contest, Problem } from "./types.ts"
import { resultOptions } from "./types.ts"
import {
  formatContestTitle,
  formatDate,
  formatProblemTitle,
  labelForOption,
} from "./storage.ts"

interface HistoryProps {
  problems: Problem[]
  attempts: Attempt[]
  contests: Contest[]
}

const HISTORY_LIMIT = 50

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function History({ problems, attempts, contests }: HistoryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const searchTerms = useMemo(() => {
    const normalized = normalizeSearchValue(searchQuery)
    return normalized ? normalized.split(/\s+/) : []
  }, [searchQuery])
  const attemptsByProblemId = useMemo(() => {
    const grouped = new Map<string, Attempt[]>()
    for (const attempt of attempts) {
      const group = grouped.get(attempt.problemId) ?? []
      group.push(attempt)
      grouped.set(attempt.problemId, group)
    }
    for (const group of grouped.values()) {
      group.sort((first, second) => second.attemptNumber - first.attemptNumber)
    }
    return grouped
  }, [attempts])
  const visibleProblems = useMemo(() => problems
    .filter((problem) => {
      const searchText = normalizeSearchValue([
        problem.year,
        problem.contest,
        problem.subcontest,
        problem.problemNumber,
        problem.subject,
      ].join(" "))
      return searchTerms.every((term) => searchText.includes(term))
    })
    .sort((first, second) => {
      const firstLatest = attemptsByProblemId.get(first.id)?.[0]
      const secondLatest = attemptsByProblemId.get(second.id)?.[0]
      return (secondLatest?.date ?? "").localeCompare(firstLatest?.date ?? "")
        || formatProblemTitle(first).localeCompare(formatProblemTitle(second))
    })
    .slice(0, HISTORY_LIMIT), [attemptsByProblemId, problems, searchTerms])
  const visibleContests = useMemo(() => contests
    .filter((contest) => {
      const searchText = normalizeSearchValue([
        contest.year,
        contest.contest,
        contest.subcontest,
      ].join(" "))
      return searchTerms.every((term) => searchText.includes(term))
    })
    .sort((first, second) => (
      second.date.localeCompare(first.date) || second.id.localeCompare(first.id)
    ))
    .slice(0, HISTORY_LIMIT), [contests, searchTerms])
  const isSearching = searchTerms.length > 0

  return (
    <>
      <h1 id="page-title">Problem history</h1>
      <search className="history-search" aria-label="Search problem history">
        <label htmlFor="history-search-input" className="input-description">Search history</label>
        <input
          id="history-search-input"
          className="input-card"
          type="search"
          placeholder="Year, contest, subcontest, problem number, or subject"
          value={searchQuery}
          onChange={(event) => { setSearchQuery(event.target.value) }}
        />
      </search>

      <section className="dashboard-card problem-history-card" aria-labelledby="problem-history-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Most recently attempted</p>
            <h2 id="problem-history-heading" className="section-header">Problems</h2>
          </div>
          <span className="count-badge" aria-label={`${visibleProblems.length} problems shown`}>
            {visibleProblems.length}
          </span>
        </div>
        {visibleProblems.length === 0 ? (
          <div className="empty-state">
            <h3>{isSearching ? "No matching problems" : "No problems yet"}</h3>
            <p>{isSearching
              ? "Try another year, contest, subcontest, problem number, or subject."
              : "Attempted problems will appear here."}</p>
          </div>
        ) : (
          <div className="problem-history-list" role="region" aria-labelledby="problem-history-heading">
            {visibleProblems.map((problem) => {
              const latestAttempt = attemptsByProblemId.get(problem.id)?.[0]
              return (
                <button key={problem.id} type="button" onClick={() => {
                  window.location.hash = `problem-${encodeURIComponent(problem.id)}`
                }}>
                  <div>
                    <h3>{formatProblemTitle(problem)}</h3>
                    <span>{problem.numAttempts} {problem.numAttempts === 1 ? "attempt" : "attempts"}</span>
                  </div>
                  <span>{latestAttempt
                    ? formatDate(latestAttempt.date, { dateStyle: "medium" })
                    : "No attempt date"}</span>
                  <span>{latestAttempt ? labelForOption(resultOptions, latestAttempt.result) : "No result"}</span>
                  <span>Review {formatDate(problem.reviewDate, { dateStyle: "medium" })}</span>
                  <span className="history-arrow" aria-hidden="true">›</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className="dashboard-card contest-history-card" aria-labelledby="contest-history-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Newest first</p>
            <h2 id="contest-history-heading" className="section-header">Contest logs</h2>
          </div>
          <span className="count-badge" aria-label={`${visibleContests.length} contests shown`}>
            {visibleContests.length}
          </span>
        </div>
        {visibleContests.length === 0 ? (
          <div className="empty-state contest-history-empty">
            <h3>{isSearching ? "No matching contests" : "No contest logs yet"}</h3>
            <p>{isSearching ? "Try another search." : "Completed contest logs will appear here."}</p>
          </div>
        ) : (
          <div className="contest-history-list" role="region" aria-labelledby="contest-history-heading">
            {visibleContests.map((contest) => (
              <button key={contest.id} className="contest-history-row" type="button" onClick={() => {
                window.location.hash = `contest-${encodeURIComponent(contest.id)}`
              }}>
                <strong>{formatContestTitle(contest)}</strong>
                <span>{formatDate(contest.date, { dateStyle: "medium" })}</span>
                <span className="contest-history-score">Score: {contest.score}</span>
                <span className="history-arrow" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export default History
