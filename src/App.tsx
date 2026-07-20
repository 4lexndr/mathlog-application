import { useEffect, useState, type KeyboardEvent } from "react"
import AttemptDetail from "./AttemptDetail"
import Dashboard from "./Dashboard"
import Footer from "./Footer"
import History from "./History"
import Journal from "./Journal"
import Queue from "./Queue"
import ReviewLog from "./ReviewLog"
import Settings from "./Settings"
import HeaderBar from "./Header"
import type { Problem, Attempt } from "./types.ts"
import {
  contestStatusOptions,
  mistakeTypeOptions,
  resultOptions,
  subjectOptions,
} from "./types.ts"
import {
  type AppSettings,
  addCalendarDays,
  loadAttempts,
  loadProblems,
  loadSettings,
  localDateKey,
  saveData,
  saveSettings,
} from "./storage.ts"
import { getReviewDelayDays } from "./reviewSchedule.ts"
import "./main.css"

type Route =
  | { "page": "dashboard" }
  | { "page": "history" }
  | { "page": "journal" }
  | { "page": "settings" }
  | { "page": "queue" }
  | { "page": "log" }
  | { "page": "review-log"; problemId: string }
  | { "page": "attempt"; attemptId: string }

type SliderInputProps = {
  label: string
  value: number
  valueLabel?: string
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

const DEFAULT_TIME_SPENT = 15
const LOG_FIELD_SELECTOR = "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"

function SliderInput({ label, value, valueLabel, min, max, step = 1, onChange }: SliderInputProps) {
  const displayedValue = valueLabel ?? String(value)

  return (
    <div className="slider-input">
      <div className="slider-input-header">
        <span className="input-description">{label}</span>
        <span className="slider-value">{displayedValue}</span>
      </div>
      <input
        className="slider-track"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={displayedValue}
        onChange={(event) => {
          onChange(Number(event.target.value))
        }}
      />
    </div>
  )
}

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

  if (hash.startsWith("review-log-")) {
    return {
      page: "review-log",
      problemId: decodeURIComponent(hash.slice("review-log-".length)),
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

  const [error, setError] = useState("")

  // Lazy initializers read local storage only during the first render.
  const [problems, setProblems] = useState<Problem[]>(loadProblems)
  const [attempts, setAttempts] = useState<Attempt[]>(loadAttempts)

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

  // Persist both related collections from one effect.
  useEffect(() => {
    saveData(problems, attempts)
  }, [problems, attempts])

  function handleSaveSettings(nextSettings: AppSettings) {
    saveSettings(nextSettings)
    setSettings(nextSettings)
    setRating(nextSettings.defaultRating)
    setSubject(nextSettings.defaultSubject)
    setContestStatus(nextSettings.defaultContestStatus)
  }

  function saveReviewAttempt(attempt: Attempt) {
    setAttempts((previous) => [...previous, attempt])
    window.location.hash = "dashboard"
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
    setYear("")
    setContest("")
    setSubcontest("")
    setProblemNumber("")
    setUrl("")
    setRating(settings.defaultRating)
    setSubject(settings.defaultSubject)
    setAttemptDate(localDateKey())
    setResult("")
    setTimeSpent(DEFAULT_TIME_SPENT)
    setMistakeType("")
    setLearning("")
    setRecognitionClue("")
    setContestStatus(settings.defaultContestStatus)
    setError("")
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
    // Validate required fields before creating either side of the data relationship.
    if (!year.trim() || !contest.trim() || !problemNumber.trim() || !subject) {
      setError("Please fill in the year, contest, problem number, and subject.")
      return
    }

    if (!attemptDate) {
      setError("Please select a date for this attempt.")
      return
    }

    if (!result) {
      setError("Please select a result for this attempt.")
      return
    }

    if (result !== "independent" && !mistakeType) {
      setError("Please select what prevented an independent solution.")
      return
    }

    if (!contestStatus) {
      setError("Please select whether the contest was rated or unrated.")
      return
    }

    const savedMistakeType = result === "independent" ? "" : mistakeType
    const reviewDelayDays = getReviewDelayDays(result)
    const savedProblem: Problem = {
      id: crypto.randomUUID(),
      year: year.trim(),
      contest: contest.trim().toUpperCase(),
      subcontest: subcontest.trim(),
      problemNumber: problemNumber.trim(),
      url: url.trim(),
      rating,
      subject,
      reviewDate: addCalendarDays(attemptDate, reviewDelayDays),
    }

    const newAttempt: Attempt = {
      id: crypto.randomUUID(),
      problemId: savedProblem.id,
      date: attemptDate,
      isReview: false,
      result,
      timeSpent,
      mistakeType: savedMistakeType,
      keyIdea: learning.trim(),
      recognitionClue: recognitionClue.trim(),
      contestStatus,
    }

    setProblems((previous) => [...previous, savedProblem])
    setAttempts((previous) => [...previous, newAttempt])
    resetLogForm()
    window.location.hash = "dashboard"
  }

  return (
    <main id="app">
      <HeaderBar resetLogForm={resetLogForm}/>
      <div className="page-content">
        {route.page === "log" ? (
        <>
          <h1 id="page-title">Create a new log</h1>
          <div className="log-layout" onKeyDown={handleLogFieldNavigation}>
            <section className="dashboard-card log-panel">
              <h2 className="section-header">Problem details</h2>
              <div className="form-section log-panel-fields">
                  <label className="input-field">
                    <span className="input-description">problem year</span>
                    <input
                      className="input-card"
                      placeholder="2024"
                      value={year}
                      onChange={(event) => {
                        setYear(event.target.value)
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">contest</span>
                    <input
                      className="input-card"
                      placeholder="AMC10"
                      value={contest}
                      autoCapitalize="characters"
                      onChange={(event) => {
                        setContest(event.target.value.toUpperCase())
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">subcontest (optional)</span>
                    <input
                      className="input-card"
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
                      className="input-card"
                      placeholder="17"
                      value={problemNumber}
                      onChange={(event) => {
                        setProblemNumber(event.target.value)
                      }}
                    />
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
                      className="input-card"
                      value={subject}
                      onChange={(event) => {
                        setSubject(event.target.value)
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
                      className="input-card"
                      type="date"
                      value={attemptDate}
                      onChange={(event) => {
                        setAttemptDate(event.target.value)
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">result</span>
                    <select
                      className="input-card"
                      value={result}
                      onChange={(event) => {
                        const nextResult = event.target.value
                        setResult(nextResult)
                        if (nextResult === "independent") setMistakeType("")
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
                        className="input-card"
                        value={mistakeType}
                        onChange={(event) => {
                          setMistakeType(event.target.value)
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
                      className="input-card"
                      value={contestStatus}
                      onChange={(event) => {
                        setContestStatus(event.target.value)
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
          <div className="log-form-footer">
            <button className="button-style create-log-button" type="button"
              onClick={saveLog}
            >
              Create log
            </button>
            {error !== "" && <span className="log-form-error" role="alert">{error}</span>}
          </div>
        </>
      ) : route.page === "attempt" ? (
        <AttemptDetail
          attemptId={route.attemptId}
          problems={problems}
          attempts={attempts}
          onSnooze={(problemId) => snoozeProblems([problemId])}
        />
      ) : route.page === "review-log" ? (
        <ReviewLog
          key={route.problemId}
          problemId={route.problemId}
          problems={problems}
          attempts={attempts}
          onSave={saveReviewAttempt}
        />
      ) : route.page === "history" ? (
        <History problems={problems} attempts={attempts} />
      ) : route.page === "journal" ? (
        <Journal problems={problems} attempts={attempts} />
      ) : route.page === "queue" ? (
        <Queue problems={problems} attempts={attempts} onSnoozeAll={moveProblemsToTomorrow} />
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
