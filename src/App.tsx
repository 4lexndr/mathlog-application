import { useEffect, useLayoutEffect, useMemo, useState, type KeyboardEvent } from "react"
import AttemptDetail from "./AttemptDetail"
import ContestDetail from "./ContestDetail"
import Dashboard from "./Dashboard"
import Footer from "./Footer"
import History from "./History"
import Journal from "./Journal"
import ProblemDetail from "./ProblemDetail"
import Queue from "./Queue"
import ReviewLog from "./ReviewLog"
import Settings from "./Settings"
import SliderInput from "./SliderInput"
import HeaderBar from "./Header"
import type { Problem, Attempt, AttemptDraft, Contest } from "./types.ts"
import {
  contestStatusOptions,
  mistakeTypeOptions,
  resultOptions,
  subjectOptions,
} from "./types.ts"
import {
  type AppSettings,
  addCalendarDays,
  loadContests,
  loadPreferences,
  loadProblemData,
  loadSettings,
  localDateKey,
  problemIdentityKey,
  saveData,
  savePreferences,
  saveSettings,
} from "./storage.ts"
import { appendAttempt, applyAttemptUpdate, removeAttempt } from "./problemAttempts.ts"
import { getNextReviewDate } from "./reviewSchedule.ts"
import "./main.css"

type Route =
  | { "page": "dashboard" }
  | { "page": "history" }
  | { "page": "journal" }
  | { "page": "settings" }
  | { "page": "queue" }
  | { "page": "log" }
  | { "page": "contest"; contestId: string }
  | { "page": "review-log"; problemId: string }
  | { "page": "problem"; problemId: string }
  | { "page": "attempt"; attemptId: string }

const DEFAULT_TIME_SPENT = 15
const LOG_FIELD_SELECTOR = "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"

function getRoute(): Route {
  // Hash routing keeps every page deployable as one static Vite entry point.
  const hash = window.location.hash.slice(1)

  if (!hash || hash === "dashboard") {
    return { page: "dashboard" }
  }

  if (hash === "history") {
    return { page: "history" }
  }

  if (hash === "journal") {
    return { page: "journal" }
  }

  if (hash === "settings") {
    return { page: "settings" }
  }

  if (hash === "queue") {
    return { page: "queue" }
  }

  if (hash === "log") {
    return { page: "log" }
  }

  if (hash.startsWith("contest-")) {
    return {
      page: "contest",
      contestId: decodeURIComponent(hash.slice("contest-".length)),
    }
  }

  if (hash.startsWith("review-log-")) {
    return {
      page: "review-log",
      problemId: decodeURIComponent(hash.slice("review-log-".length)),
    }
  }

  if (hash.startsWith("problem-")) {
    return {
      page: "problem",
      problemId: decodeURIComponent(hash.slice("problem-".length)),
    }
  }

  if (hash.startsWith("attempt-")) {
    return {
      page: "attempt",
      attemptId: decodeURIComponent(hash.slice("attempt-".length)),
    }
  }

  return {
    page: "attempt",
    attemptId: decodeURIComponent(hash),
  }
}

function App() {
  // Route and preferences initialize directly from browser state.
  const [route, setRoute] = useState<Route>(getRoute)
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [logType, setLogType] = useState<"problem" | "contest">("problem")

  // New-log problem fields.
  const [year, setYear] = useState("")
  const [contest, setContest] = useState("")
  const [subcontest, setSubcontest] = useState("")
  const [problemNumber, setProblemNumber] = useState("")
  const [url, setUrl] = useState("")
  const [rating, setRating] = useState(settings.defaultRating)
  const [subject, setSubject] = useState(settings.defaultSubject)

  // New-log attempt fields.
  const [attemptDate, setAttemptDate] = useState(() => localDateKey())
  const [result, setResult] = useState("")
  const [timeSpent, setTimeSpent] = useState(DEFAULT_TIME_SPENT)
  const [mistakeType, setMistakeType] = useState("")
  const [learning, setLearning] = useState("")
  const [recognitionClue, setRecognitionClue] = useState("")
  const [contestStatus, setContestStatus] = useState(settings.defaultContestStatus)

  // New contest-log fields use separate state so switching log types preserves both drafts.
  const [contestYear, setContestYear] = useState("")
  const [contestName, setContestName] = useState("")
  const [contestSubcontest, setContestSubcontest] = useState("")
  const [contestDate, setContestDate] = useState(() => localDateKey())
  const [contestScore, setContestScore] = useState("")

  const [error, setError] = useState("")
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set())

  // Lazy initializers read local storage only during the first render.
  const [initialProblemData] = useState(loadProblemData)
  const [problems, setProblems] = useState<Problem[]>(initialProblemData.problems)
  const [attempts, setAttempts] = useState<Attempt[]>(initialProblemData.attempts)
  const [contests, setContests] = useState<Contest[]>(loadContests)
  const duplicateProblemExists = useMemo(() => {
    if (!year.trim() || !contest.trim() || !problemNumber.trim()) return false

    const draftIdentity = problemIdentityKey({ year, contest, subcontest, problemNumber })
    return problems.some((problem) => problemIdentityKey(problem) === draftIdentity)
  }, [contest, problemNumber, problems, subcontest, year])

  // Keep React state synchronized with navigation links and browser history.
  useEffect(() => {
    function handleHashChange() {
      setRoute(getRoute())
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [])

  // Persist the app's three log collections from one effect.
  useEffect(() => {
    if (!initialProblemData.canPersist) return
    saveData(problems, attempts, contests)
  }, [attempts, contests, initialProblemData.canPersist, problems])

  // Reapply the last successful log's choices whenever the log page opens.
  useEffect(() => {
    if (route.page !== "log") return

    const preferences = loadPreferences()
    if (preferences.rating !== undefined) setRating(preferences.rating)
    if (preferences.subject !== undefined) setSubject(preferences.subject)
    if (preferences.contestStatus !== undefined) setContestStatus(preferences.contestStatus)
  }, [route.page])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = settings.colorTheme
  }, [settings.colorTheme])

  function handleSaveSettings(nextSettings: AppSettings) {
    saveSettings(nextSettings)
    setSettings(nextSettings)
    setRating(nextSettings.defaultRating)
    setSubject(nextSettings.defaultSubject)
    setContestStatus(nextSettings.defaultContestStatus)
  }

  function saveReviewAttempt(problemId: string, draft: AttemptDraft) {
    const problem = problems.find((item) => item.id === problemId)
    if (!problem) return

    const next = appendAttempt(problem, draft, crypto.randomUUID())

    setProblems((previous) => previous.map((problem) => (
      problem.id === problemId
        ? next.problem
        : problem
    )))
    setAttempts((previous) => [...previous, next.attempt])
    window.location.hash = "dashboard"
  }

  function updateProblem(updatedProblem: Problem) {
    setProblems((previous) => previous.map((problem) => (
      problem.id === updatedProblem.id ? updatedProblem : problem
    )))
  }

  function updateAttemptLog(updatedAttempt: Attempt) {
    const problem = problems.find((item) => item.id === updatedAttempt.problemId)
    if (problem) {
      const updatedProblem = applyAttemptUpdate(problem, updatedAttempt)
      setProblems((previous) => previous.map((item) => (
        item.id === problem.id ? updatedProblem : item
      )))
    }
    setAttempts((previous) => previous.map((attempt) => (
      attempt.id === updatedAttempt.id ? updatedAttempt : attempt
    )))
  }

  function deleteAttemptLog(attemptId: string) {
    const deletedAttempt = attempts.find((attempt) => attempt.id === attemptId)
    if (!deletedAttempt) return

    const problem = problems.find((item) => item.id === deletedAttempt.problemId)
    if (!problem) return
    const deletion = removeAttempt(
      problem,
      attempts.filter((attempt) => attempt.problemId === deletedAttempt.problemId),
      attemptId,
    )
    setAttempts((previous) => [
      ...previous.filter((attempt) => attempt.problemId !== deletedAttempt.problemId),
      ...deletion.attempts,
    ])
    if (!deletion.problem) {
      setProblems((previous) => previous.filter((problem) => problem.id !== deletedAttempt.problemId))
      window.location.hash = "history"
      return
    }
    setProblems((previous) => previous.map((problem) => (
      problem.id === deletedAttempt.problemId ? deletion.problem! : problem
    )))
    window.location.hash = `problem-${encodeURIComponent(deletedAttempt.problemId)}`
  }

  function updateContestLog(updatedContest: Contest) {
    setContests((previous) => previous.map((contest) => (
      contest.id === updatedContest.id ? updatedContest : contest
    )))
  }

  function deleteContestLog(contestId: string) {
    setContests((previous) => previous.filter((contest) => contest.id !== contestId))
    window.location.hash = "history"
  }

  function snoozeProblems(problemIds: string[]) {
    const selectedProblemIds = new Set(problemIds)

    setProblems((previous) => previous.map((problem) => {
      if (!selectedProblemIds.has(problem.id)) return problem

      const nextReviewDate = addCalendarDays(problem.reviewDate, 1)
      return nextReviewDate ? { ...problem, reviewDate: nextReviewDate } : problem
    }))
  }

  function moveProblemsToTomorrow(problemIds: string[]) {
    const selectedProblemIds = new Set(problemIds)
    const tomorrow = addCalendarDays(localDateKey(), 1)
    if (!tomorrow) return

    setProblems((previous) => previous.map((problem) => (
      selectedProblemIds.has(problem.id)
        ? { ...problem, reviewDate: tomorrow }
        : problem
    )))
  }

  function resetLogForm() {
    const preferences = loadPreferences()

    setLogType("problem")
    setYear("")
    setContest("")
    setSubcontest("")
    setProblemNumber("")
    setUrl("")
    setRating(preferences.rating ?? settings.defaultRating)
    setSubject(preferences.subject ?? settings.defaultSubject)
    setAttemptDate(localDateKey())
    setResult("")
    setTimeSpent(DEFAULT_TIME_SPENT)
    setMistakeType("")
    setLearning("")
    setRecognitionClue("")
    setContestStatus(preferences.contestStatus ?? settings.defaultContestStatus)
    setContestYear("")
    setContestName("")
    setContestSubcontest("")
    setContestDate(localDateKey())
    setContestScore("")
    setError("")
    setInvalidFields(new Set())
  }

  function clearInvalidField(field: string) {
    setInvalidFields((previous) => {
      if (!previous.has(field)) return previous

      const next = new Set(previous)
      next.delete(field)
      return next
    })
  }

  function handleLogFieldNavigation(event: KeyboardEvent<HTMLDivElement>) {
    const currentField = event.target
    if (!(
      currentField instanceof HTMLInputElement
      || currentField instanceof HTMLSelectElement
      || currentField instanceof HTMLTextAreaElement
    )) return

    const fields = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(LOG_FIELD_SELECTOR))
    const currentIndex = fields.indexOf(currentField)
    if (currentIndex === -1) return

    if (event.key === "Enter") {
      const nextField = fields[currentIndex + 1]
      if (nextField) {
        event.preventDefault()
        nextField.focus()
      }
      return
    }

    const isDeleteKey = event.key === "Delete" || event.key === "Backspace"
    if (isDeleteKey && currentField.value === "") {
      const previousField = fields[currentIndex - 1]
      if (previousField) {
        event.preventDefault()
        previousField.focus()
      }
    }
  }

  function saveLog() {
    // Validate every required field at once so all needed corrections are visible.
    const nextInvalidFields = new Set<string>()
    if (!year.trim()) nextInvalidFields.add("problem-year")
    if (!contest.trim()) nextInvalidFields.add("problem-contest")
    if (!problemNumber.trim()) nextInvalidFields.add("problem-number")
    if (!subject) nextInvalidFields.add("problem-subject")
    if (!attemptDate) nextInvalidFields.add("attempt-date")
    if (!result) nextInvalidFields.add("attempt-result")
    if (result && result !== "independent" && !mistakeType) {
      nextInvalidFields.add("attempt-mistake-type")
    }
    if (!contestStatus) nextInvalidFields.add("attempt-contest-status")

    if (nextInvalidFields.size > 0) {
      setInvalidFields(nextInvalidFields)
      setError("Please correct the highlighted fields before creating this log.")
      return
    }

    const savedMistakeType = result === "independent" ? "" : mistakeType
    const existingProblem = problems.find((problem) => (
      problemIdentityKey(problem) === problemIdentityKey({
        year,
        contest,
        subcontest,
        problemNumber,
      })
    ))
    const problemId = existingProblem?.id ?? crypto.randomUUID()
    const attemptNumber = (existingProblem?.numAttempts ?? 0) + 1
    const nextReviewDate = getNextReviewDate(attemptDate, result)
    const savedProblem: Problem = existingProblem ?? {
      id: problemId,
      year: year.trim(),
      contest: contest.trim().toUpperCase(),
      subcontest: subcontest.trim(),
      problemNumber: problemNumber.trim(),
      url: url.trim(),
      rating,
      subject,
      reviewDate: nextReviewDate,
      numAttempts: 0,
    }

    const newAttempt: Attempt = {
      id: crypto.randomUUID(),
      problemId,
      date: attemptDate,
      attemptNumber,
      result,
      timeSpent,
      mistakeType: savedMistakeType,
      keyIdea: learning.trim(),
      recognitionClue: recognitionClue.trim(),
      contestStatus,
    }

    savePreferences({ rating, subject, contestStatus })
    setProblems((previous) => existingProblem
      ? previous.map((problem) => problem.id === existingProblem.id
        ? { ...problem, reviewDate: nextReviewDate, numAttempts: attemptNumber }
        : problem)
      : [...previous, { ...savedProblem, reviewDate: nextReviewDate, numAttempts: 1 }])
    setAttempts((previous) => [...previous, newAttempt])
    resetLogForm()
    window.location.hash = "dashboard"
  }

  function saveContestLog() {
    const parsedScore = Number(contestScore)
    const nextInvalidFields = new Set<string>()
    if (!contestYear.trim()) nextInvalidFields.add("contest-year")
    if (!contestName.trim()) nextInvalidFields.add("contest-name")
    if (!contestDate) nextInvalidFields.add("contest-date")
    if (contestScore.trim() === "" || !Number.isFinite(parsedScore) || parsedScore < 0) {
      nextInvalidFields.add("contest-score")
    }

    if (nextInvalidFields.size > 0) {
      setInvalidFields(nextInvalidFields)
      setError("Please correct the highlighted fields before creating this log.")
      return
    }

    const savedContest: Contest = {
      id: crypto.randomUUID(),
      year: contestYear.trim(),
      contest: contestName.trim().toUpperCase(),
      subcontest: contestSubcontest.trim(),
      date: contestDate,
      score: parsedScore,
    }

    setContests((previous) => [...previous, savedContest])
    resetLogForm()
    window.location.hash = "dashboard"
  }

  return (
    <main id="app">
      <HeaderBar resetLogForm={resetLogForm}/>
      <div className="page-content">
        {!initialProblemData.canPersist && (
          <p className="storage-error" role="alert">
            Saved problem data could not be migrated safely. The original local data was left unchanged.
          </p>
        )}
        {route.page === "log" ? (
        <>
          <h1 id="page-title">Create a new log</h1>
          <fieldset className="log-type-selector">
            <legend className="visually-hidden">Choose a log type</legend>
            <label className={`log-type-option ${logType === "problem" ? "selected" : ""}`}>
              <input
                className="visually-hidden"
                type="radio"
                name="log-type"
                value="problem"
                checked={logType === "problem"}
                onChange={() => {
                  setLogType("problem")
                  setError("")
                  setInvalidFields(new Set())
                }}
              />
              <span>Problem</span>
              <small>Record one problem attempt</small>
            </label>
            <label className={`log-type-option ${logType === "contest" ? "selected" : ""}`}>
              <input
                className="visually-hidden"
                type="radio"
                name="log-type"
                value="contest"
                checked={logType === "contest"}
                onChange={() => {
                  setLogType("contest")
                  setError("")
                  setInvalidFields(new Set())
                }}
              />
              <span>Contest</span>
              <small>Record a complete contest score</small>
            </label>
          </fieldset>

          {logType === "problem" ? (
          <div className="log-layout" onKeyDown={handleLogFieldNavigation}>
            <section className="dashboard-card log-panel">
              <h2 className="section-header">Problem details</h2>
              <div className="form-section log-panel-fields">
                  <label className="input-field">
                    <span className="input-description">problem year</span>
                    <input
                      className={`input-card ${invalidFields.has("problem-year")
                        ? "input-error"
                        : duplicateProblemExists ? "input-warning" : ""}`}
                      aria-invalid={invalidFields.has("problem-year")}
                      aria-describedby={duplicateProblemExists ? "duplicate-problem-hint" : undefined}
                      placeholder="2024"
                      value={year}
                      onChange={(event) => {
                        setYear(event.target.value)
                        clearInvalidField("problem-year")
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">contest</span>
                    <input
                      className={`input-card ${invalidFields.has("problem-contest")
                        ? "input-error"
                        : duplicateProblemExists ? "input-warning" : ""}`}
                      aria-invalid={invalidFields.has("problem-contest")}
                      aria-describedby={duplicateProblemExists ? "duplicate-problem-hint" : undefined}
                      placeholder="AMC10"
                      value={contest}
                      autoCapitalize="characters"
                      onChange={(event) => {
                        setContest(event.target.value.toUpperCase())
                        clearInvalidField("problem-contest")
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">subcontest (optional)</span>
                    <input
                      className={`input-card ${duplicateProblemExists ? "input-warning" : ""}`}
                      aria-describedby={duplicateProblemExists ? "duplicate-problem-hint" : undefined}
                      placeholder="A"
                      value={subcontest}
                      onChange={(event) => {
                        setSubcontest(event.target.value)
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">problem number</span>
                    <input
                      className={`input-card ${invalidFields.has("problem-number")
                        ? "input-error"
                        : duplicateProblemExists ? "input-warning" : ""}`}
                      aria-invalid={invalidFields.has("problem-number")}
                      aria-describedby={duplicateProblemExists ? "duplicate-problem-hint" : undefined}
                      placeholder="17"
                      value={problemNumber}
                      onChange={(event) => {
                        setProblemNumber(event.target.value)
                        clearInvalidField("problem-number")
                      }}
                    />
                    {duplicateProblemExists && (
                      <span id="duplicate-problem-hint" className="duplicate-problem-hint" role="status">
                        This will be added as another attempt on the existing problem.
                      </span>
                    )}
                  </label>

                  <label className="input-field">
                    <span className="input-description">url</span>
                    <input
                      className="input-card"
                      type="url"
                      placeholder="https://..."
                      value={url}
                      onChange={(event) => {
                        setUrl(event.target.value)
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">subject</span>
                    <select
                      className={`input-card ${invalidFields.has("problem-subject") ? "input-error" : ""}`}
                      aria-invalid={invalidFields.has("problem-subject")}
                      value={subject}
                      onChange={(event) => {
                        setSubject(event.target.value)
                        clearInvalidField("problem-subject")
                      }}
                    >
                      <option value="" disabled>
                        Select a subject
                      </option>
                      {subjectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <SliderInput
                    label="rating"
                    value={rating}
                    min={1500}
                    max={2000}
                    step={50}
                    onChange={setRating}
                  />
              </div>
            </section>

            <section className="dashboard-card log-panel">
              <h2 className="section-header">Attempt details</h2>
              <div className="form-section log-panel-fields">
                  <label className="input-field">
                    <span className="input-description">attempt date</span>
                    <input
                      className={`input-card ${invalidFields.has("attempt-date") ? "input-error" : ""}`}
                      aria-invalid={invalidFields.has("attempt-date")}
                      type="date"
                      value={attemptDate}
                      onChange={(event) => {
                        setAttemptDate(event.target.value)
                        clearInvalidField("attempt-date")
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">result</span>
                    <select
                      className={`input-card ${invalidFields.has("attempt-result") ? "input-error" : ""}`}
                      aria-invalid={invalidFields.has("attempt-result")}
                      value={result}
                      onChange={(event) => {
                        const nextResult = event.target.value
                        setResult(nextResult)
                        clearInvalidField("attempt-result")
                        if (nextResult === "independent") setMistakeType("")
                        if (nextResult === "independent") clearInvalidField("attempt-mistake-type")
                      }}
                    >
                      <option value="" disabled>
                        Select a result
                      </option>
                      {resultOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <SliderInput
                    label="time spent"
                    value={timeSpent}
                    valueLabel={`${timeSpent} min`}
                    min={1}
                    max={30}
                    onChange={setTimeSpent}
                  />

                  {result !== "" && result !== "independent" && (
                    <label className="input-field">
                      <span className="input-description">mistake type</span>
                      <select
                        className={`input-card ${invalidFields.has("attempt-mistake-type") ? "input-error" : ""}`}
                        aria-invalid={invalidFields.has("attempt-mistake-type")}
                        value={mistakeType}
                        onChange={(event) => {
                          setMistakeType(event.target.value)
                          clearInvalidField("attempt-mistake-type")
                        }}
                      >
                        <option value="" disabled>Select a mistake type</option>
                        {mistakeTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}{option.description ? ` — ${option.description}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="input-field">
                    <span className="input-description">contest rated or unrated?</span>
                    <select
                      className={`input-card ${invalidFields.has("attempt-contest-status") ? "input-error" : ""}`}
                      aria-invalid={invalidFields.has("attempt-contest-status")}
                      value={contestStatus}
                      onChange={(event) => {
                        setContestStatus(event.target.value)
                        clearInvalidField("attempt-contest-status")
                      }}
                    >
                      <option value="" disabled>Select rated or unrated</option>
                      {contestStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="input-field">
                    <span className="input-description">what I learned</span>
                    <textarea
                      className="input-card"
                      placeholder="A short phrase or sentence you want to remember"
                      value={learning}
                      onChange={(event) => {
                        setLearning(event.target.value)
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">recognition clue</span>
                    <textarea
                      className="input-card"
                      placeholder="What should help you recognize this approach next time?"
                      value={recognitionClue}
                      onChange={(event) => {
                        setRecognitionClue(event.target.value)
                      }}
                    />
                  </label>

              </div>
            </section>
          </div>
          ) : (
            <div className="contest-log-layout" onKeyDown={handleLogFieldNavigation}>
              <section className="dashboard-card log-panel">
                <h2 className="section-header">Contest details</h2>
                <div className="form-section log-panel-fields contest-log-fields">
                  <label className="input-field">
                    <span className="input-description">year</span>
                    <input
                      className={`input-card ${invalidFields.has("contest-year") ? "input-error" : ""}`}
                      aria-invalid={invalidFields.has("contest-year")}
                      placeholder="2026"
                      value={contestYear}
                      onChange={(event) => {
                        setContestYear(event.target.value)
                        clearInvalidField("contest-year")
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">contest</span>
                    <input
                      className={`input-card ${invalidFields.has("contest-name") ? "input-error" : ""}`}
                      aria-invalid={invalidFields.has("contest-name")}
                      placeholder="AMC10"
                      value={contestName}
                      autoCapitalize="characters"
                      onChange={(event) => {
                        setContestName(event.target.value.toUpperCase())
                        clearInvalidField("contest-name")
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">subcontest (optional)</span>
                    <input
                      className="input-card"
                      placeholder="A"
                      value={contestSubcontest}
                      onChange={(event) => {
                        setContestSubcontest(event.target.value)
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">contest date</span>
                    <input
                      className={`input-card ${invalidFields.has("contest-date") ? "input-error" : ""}`}
                      aria-invalid={invalidFields.has("contest-date")}
                      type="date"
                      value={contestDate}
                      onChange={(event) => {
                        setContestDate(event.target.value)
                        clearInvalidField("contest-date")
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">score</span>
                    <input
                      className={`input-card ${invalidFields.has("contest-score") ? "input-error" : ""}`}
                      aria-invalid={invalidFields.has("contest-score")}
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      placeholder="120"
                      value={contestScore}
                      onChange={(event) => {
                        setContestScore(event.target.value)
                        clearInvalidField("contest-score")
                      }}
                    />
                  </label>
                </div>
              </section>
            </div>
          )}
          <div className="log-form-footer">
            <button className="button-style create-log-button" type="button"
              onClick={logType === "problem" ? saveLog : saveContestLog}
            >
              {logType === "problem" ? "Create problem log" : "Create contest log"}
            </button>
            {error !== "" && <span className="log-form-error" role="alert">{error}</span>}
          </div>
        </>
      ) : route.page === "contest" ? (
        <ContestDetail
          contestId={route.contestId}
          contests={contests}
          onUpdate={updateContestLog}
          onDelete={deleteContestLog}
        />
      ) : route.page === "attempt" ? (
        <AttemptDetail
          attemptId={route.attemptId}
          problems={problems}
          attempts={attempts}
          onUpdate={updateAttemptLog}
          onDelete={deleteAttemptLog}
        />
      ) : route.page === "problem" ? (
        <ProblemDetail
          key={route.problemId}
          problemId={route.problemId}
          problems={problems}
          attempts={attempts}
          onSnooze={(problemId) => snoozeProblems([problemId])}
          onUpdate={updateProblem}
        />
      ) : route.page === "review-log" ? (
        <ReviewLog
          key={route.problemId}
          problemId={route.problemId}
          problems={problems}
          onSave={saveReviewAttempt}
        />
      ) : route.page === "history" ? (
        <History
          problems={problems}
          attempts={attempts}
          contests={contests}
        />
      ) : route.page === "journal" ? (
        <Journal problems={problems} attempts={attempts} />
      ) : route.page === "queue" ? (
        <Queue problems={problems} onSnoozeAll={moveProblemsToTomorrow} />
      ) : route.page === "settings" ? (
        <Settings settings={settings} onSave={handleSaveSettings} />
      ) : (
        <Dashboard problems={problems} attempts={attempts} />
        )}
      </div>
      <Footer />
    </main>
  )
}

export default App
