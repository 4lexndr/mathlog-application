import { useEffect, useState } from "react"
import AttemptDetail from "./AttemptDetail"
import Dashboard from "./Dashboard"
import History from "./History"
import Journal from "./Journal"
import Settings from "./Settings"
import WeeklyReview from "./WeeklyReview"
import type { Problem, Attempt } from "./types.ts"
import {
  contestStatusOptions,
  mistakeTypeOptions,
  resultOptions,
  subjectOptions,
} from "./types.ts"
import {
  type AppSettings,
  getReviewRecommendation,
  loadAttempts,
  loadProblems,
  loadSettings,
  parseReviewDays,
  saveData,
  saveSettings,
} from "./storage.ts"
import "./main.css"

type Route =
  | { "page": "dashboard" }
  | { "page": "history" }
  | { "page": "journal" }
  | { "page": "settings" }
  | { "page": "weekly-review" }
  | { "page": "log"; problemId?: string }
  | { "page": "attempt"; attemptId: string }

type SliderInputProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024

function SliderInput({ label, value, min, max, step = 1, onChange }: SliderInputProps) {
  return (
    <div className="slider-input">
      <div className="slider-input-header">
        <span className="input-description">{label}</span>
        <span className="slider-value">{value}</span>
      </div>
      <input
        className="slider-track"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
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

  if (hash === "weekly-review") {
    return { page: "weekly-review" }
  }

  if (hash === "log") {
    return { page: "log" }
  }

  if (hash.startsWith("log/")) {
    const problemId = decodeURIComponent(hash.slice("log/".length))
    return problemId ? { page: "log", problemId } : { page: "dashboard" }
  }

  return {
    page: "attempt",
    attemptId: decodeURIComponent(hash),
  }
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Could not read the image"))
      }
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error("Could not read the image"))
    }

    reader.readAsDataURL(file)
  })
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
  const [screenshot, setScreenshot] = useState("")

  // New-log attempt fields.
  const [result, setResult] = useState("")
  const [mistakeType, setMistakeType] = useState("")
  const [learning, setLearning] = useState("")
  const [recognitionClue, setRecognitionClue] = useState("")
  const [contestStatus, setContestStatus] = useState(settings.defaultContestStatus)
  const [reviewAfterDays, setReviewAfterDays] = useState("")
  const [reviewDaysManuallyEdited, setReviewDaysManuallyEdited] = useState(false)

  // Form feedback is kept separate so image failures do not block other fields.
  const [error, setError] = useState("")
  const [screenshotError, setScreenshotError] = useState("")

  // Lazy initializers read local storage only during the first render.
  const [problems, setProblems] = useState<Problem[]>(loadProblems)
  const [attempts, setAttempts] = useState<Attempt[]>(loadAttempts)
  const reviewProblemId = route.page === "log" ? route.problemId : undefined
  const reviewProblem = reviewProblemId
    ? problems.find((problem) => problem.id === reviewProblemId)
    : undefined

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

  // Review routes reuse the problem metadata and start with fresh attempt fields.
  useEffect(() => {
    if (!reviewProblemId) return

    const problem = problems.find((item) => item.id === reviewProblemId)
    if (!problem) {
      setError("This problem could not be found.")
      return
    }

    const previousAttempt = attempts.findLast((attempt) => attempt.problemId === problem.id)
    setYear(problem.year)
    setContest(problem.contest)
    setSubcontest(problem.subcontest)
    setProblemNumber(problem.problemNumber)
    setUrl(problem.url)
    setRating(problem.rating)
    setSubject(problem.subject)
    setScreenshot(problem.screenshot ?? "")
    setResult("")
    setMistakeType("")
    setLearning("")
    setRecognitionClue("")
    setContestStatus(previousAttempt?.contestStatus ?? settings.defaultContestStatus)
    setReviewAfterDays(
      settings.defaultReviewDays === null ? "" : String(settings.defaultReviewDays),
    )
    setReviewDaysManuallyEdited(false)
    setError("")
    setScreenshotError("")
  }, [attempts, problems, reviewProblemId, settings.defaultContestStatus, settings.defaultReviewDays])

  const reviewRecommendation = settings.adaptiveReviewScheduling
    ? getReviewRecommendation(result, mistakeType)
    : null
  const automaticReviewDays = reviewRecommendation?.recommendedDays
    ?? settings.defaultReviewDays

  // Follow the recommendation until the user explicitly overrides the interval.
  useEffect(() => {
    if (reviewDaysManuallyEdited) return

    setReviewAfterDays(
      automaticReviewDays === null ? "" : String(automaticReviewDays),
    )
  }, [automaticReviewDays, reviewDaysManuallyEdited])

  function handleSaveSettings(nextSettings: AppSettings) {
    saveSettings(nextSettings)
    setSettings(nextSettings)
    setRating(nextSettings.defaultRating)
    setSubject(nextSettings.defaultSubject)
    setContestStatus(nextSettings.defaultContestStatus)
    setReviewDaysManuallyEdited(false)
  }

  // Images are validated before being stored as local data URLs.
  async function handleScreenshot(file?: File) {
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setScreenshotError("Please choose a valid image.")
      return
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setScreenshotError("Please choose an image smaller than 2 MB.")
      return
    }
    try {
      setScreenshot(await fileToDataURL(file))
      setScreenshotError("")
    } catch {
      setScreenshotError("The screenshot could not be read.")
    }
  }

  function resetLogForm() {
    setYear("")
    setContest("")
    setSubcontest("")
    setProblemNumber("")
    setUrl("")
    setRating(settings.defaultRating)
    setSubject(settings.defaultSubject)
    setScreenshot("")
    setResult("")
    setMistakeType("")
    setLearning("")
    setRecognitionClue("")
    setContestStatus(settings.defaultContestStatus)
    setReviewAfterDays("")
    setReviewDaysManuallyEdited(false)
    setError("")
    setScreenshotError("")
  }

  function saveLog() {
    // Validate required fields before creating either side of the data relationship.
    if (reviewProblemId && !reviewProblem) {
      setError("This problem could not be found.")
      return
    }

    if (!year.trim() || !contest.trim() || !problemNumber.trim() || !subject) {
      setError("Please fill in the year, contest, problem number, and subject.")
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

    const parsedReviewDays = parseReviewDays(reviewAfterDays)
    if (parsedReviewDays === undefined) {
      setError("Review timing must be a whole number of days.")
      return
    }

    const savedProblem: Problem = {
      id: reviewProblem?.id ?? crypto.randomUUID(),
      year: year.trim(),
      contest: contest.trim(),
      subcontest: subcontest.trim(),
      problemNumber: problemNumber.trim(),
      url: url.trim(),
      rating,
      subject,
      screenshot: screenshot || undefined,
    }

    const newAttempt: Attempt = {
      id: crypto.randomUUID(),
      problemId: savedProblem.id,
      date: new Date().toISOString(),
      result,
      timeSpent: 0,
      mistakeType: result === "independent" ? "" : mistakeType,
      keyIdea: learning.trim(),
      recognitionClue: recognitionClue.trim(),
      contestStatus,
      reviewAfterDays: parsedReviewDays,
    }

    setProblems((previous) => reviewProblem
      ? previous.map((problem) => problem.id === savedProblem.id ? savedProblem : problem)
      : [...previous, savedProblem])
    setAttempts((previous) => [...previous, newAttempt])
    resetLogForm()
    window.location.hash = "dashboard"
  }

  const navigationValue = route.page === "attempt" || route.page === "log"
    ? ""
    : route.page

  return (
    <main id="app">
      <header id="header-bar">
        <a id="brand-name" href="#dashboard">mathlog</a>
        <div className="header-actions">
          <label className="header-navigation">
            <span className="visually-hidden">Navigate to page</span>
            <select
              className="header-page-select"
              aria-label="Navigate to page"
              value={navigationValue}
              onChange={(event) => {
                window.location.hash = event.target.value
              }}
            >
              <option value="" disabled>Navigate</option>
              <option value="dashboard">Dashboard</option>
              <option value="weekly-review">Weekly review</option>
              <option value="journal">Journal</option>
              <option value="history">History</option>
              <option value="settings">Settings</option>
            </select>
          </label>
          <button id="new-log-button" type="button"
            onClick={() => {
              resetLogForm()
              window.location.hash = "log"
            }}
          >
            <span aria-hidden="true">＋</span>
            New log
          </button>
        </div>
      </header>

      {route.page === "log" ? (
        <>
          <h1 id="page-title">{reviewProblemId ? "Log a review" : "Create a new log"}</h1>
          <div className="log-layout">
            <div>
              <section className="dashboard-card">
                <div className="form-section">
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
                      onChange={(event) => {
                        setContest(event.target.value)
                      }}
                    />
                  </label>

                  <label className="input-field">
                    <span className="input-description">subcontest</span>
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

                <div className="form-section">
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

                  <label className="input-field">
                    <span className="input-description">review in (days)</span>
                    <input
                      className="input-card"
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      placeholder="Leave blank for no review"
                      value={reviewAfterDays}
                      onChange={(event) => {
                        setReviewAfterDays(event.target.value)
                        setReviewDaysManuallyEdited(true)
                      }}
                    />
                    {reviewRecommendation && (
                      <small className="review-recommendation">
                        Suggested range: {reviewRecommendation.minDays}–{reviewRecommendation.maxDays}{" "}
                        days for {reviewRecommendation.reason}. You can override the suggested{" "}
                        {reviewRecommendation.recommendedDays}-day interval.
                      </small>
                    )}
                    {!reviewRecommendation && settings.defaultReviewDays !== null && (
                      <small className="review-recommendation">
                        Using your default {settings.defaultReviewDays}-day review interval.
                      </small>
                    )}
                  </label>
                </div>
              </section>
              <div className="log-form-footer">
                <button className="button-style create-log-button" type="button"
                  onClick={saveLog}
                >
                  {reviewProblemId ? "Log review" : "Create log"}
                </button>
                {error !== "" && <span className="log-form-error" role="alert">{error}</span>}
              </div>
            </div>

            <aside className="dashboard-card screenshot-panel">
              <h2>Problem screenshot</h2>
              <p>Optionally attach an image of the problem.</p>

              {screenshot ? (
                <div className="screenshot-preview">
                  <img src={screenshot} alt="Problem screenshot preview" />
                  <div className="screenshot-actions">
                    <label className="secondary-button">
                      Replace
                      <input
                        className="visually-hidden"
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          void handleScreenshot(event.target.files?.[0])
                        }}
                      />
                    </label>
                    <button className="secondary-button" type="button" onClick={() => setScreenshot("")}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="screenshot-upload">
                  <input
                    className="visually-hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      void handleScreenshot(event.target.files?.[0])
                    }}
                  />
                  <strong>Choose an image</strong>
                  <small>PNG, JPG, or another image under 2 MB</small>
                </label>
              )}

              {screenshotError !== "" && (
                <p className="screenshot-error" role="alert">{screenshotError}</p>
              )}
            </aside>
          </div>
        </>
      ) : route.page === "attempt" ? (
        <AttemptDetail
          attemptId={route.attemptId}
          problems={problems}
          attempts={attempts}
        />
      ) : route.page === "history" ? (
        <History problems={problems} attempts={attempts} />
      ) : route.page === "journal" ? (
        <Journal problems={problems} attempts={attempts} />
      ) : route.page === "settings" ? (
        <Settings settings={settings} onSave={handleSaveSettings} />
      ) : route.page === "weekly-review" ? (
        <WeeklyReview attempts={attempts} />
      ) : (
        <Dashboard problems={problems} attempts={attempts} />
      )}
    </main>
  )
}

export default App
