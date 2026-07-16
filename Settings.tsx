import { useState } from "react"
import { contestStatusOptions, subjectOptions } from "./types.ts"
import type { AppSettings } from "./storage.ts"
import { DEFAULT_APP_SETTINGS, parseReviewDays } from "./storage.ts"

interface SettingsProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

function Settings({ settings, onSave }: SettingsProps) {
  const [defaultSubject, setDefaultSubject] = useState(settings.defaultSubject)
  const [defaultRating, setDefaultRating] = useState(settings.defaultRating)
  const [defaultContestStatus, setDefaultContestStatus] = useState(settings.defaultContestStatus)
  const [adaptiveReviewScheduling, setAdaptiveReviewScheduling] = useState(
    settings.adaptiveReviewScheduling,
  )
  const [defaultReviewDays, setDefaultReviewDays] = useState(
    settings.defaultReviewDays === null ? "" : String(settings.defaultReviewDays),
  )
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  function restoreDefaults() {
    // Restore the controls first; the user still chooses when to save them.
    setDefaultSubject(DEFAULT_APP_SETTINGS.defaultSubject)
    setDefaultRating(DEFAULT_APP_SETTINGS.defaultRating)
    setDefaultContestStatus(DEFAULT_APP_SETTINGS.defaultContestStatus)
    setAdaptiveReviewScheduling(DEFAULT_APP_SETTINGS.adaptiveReviewScheduling)
    setDefaultReviewDays("")
    setError("")
    setSaved(false)
  }

  function save() {
    const parsedReviewDays = parseReviewDays(defaultReviewDays)
    if (parsedReviewDays === undefined) {
      setError("Default review timing must be a whole number of days.")
      setSaved(false)
      return
    }

    onSave({
      defaultSubject,
      defaultRating,
      defaultContestStatus,
      adaptiveReviewScheduling,
      defaultReviewDays: parsedReviewDays,
    })
    setError("")
    setSaved(true)
  }

  return (
    <>
      <h1 id="page-title">Settings</h1>

      <section className="dashboard-card settings-card" aria-labelledby="settings-heading">
        <div>
          <p className="section-kicker">New log defaults</p>
          <h2 id="settings-heading" className="section-header">Logging preferences</h2>
        </div>

        <div className="settings-grid">
          <label className="input-field">
            <span className="input-description">default subject</span>
            <select
              className="input-card"
              value={defaultSubject}
              onChange={(event) => {
                setDefaultSubject(event.target.value)
                setSaved(false)
              }}
            >
              <option value="">No default</option>
              {subjectOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="input-field">
            <span className="input-description">default contest status</span>
            <select
              className="input-card"
              value={defaultContestStatus}
              onChange={(event) => {
                setDefaultContestStatus(event.target.value)
                setSaved(false)
              }}
            >
              <option value="">No default</option>
              {contestStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <div className="slider-input wide-field">
            <div className="slider-input-header">
              <label className="input-description" htmlFor="default-rating">default rating</label>
              <span className="slider-value">{defaultRating}</span>
            </div>
            <input
              id="default-rating"
              className="slider-track"
              type="range"
              min="1500"
              max="2000"
              step="50"
              value={defaultRating}
              onChange={(event) => {
                setDefaultRating(Number(event.target.value))
                setSaved(false)
              }}
            />
          </div>
        </div>

        <div className="form-section">
          <p className="section-kicker">Review scheduling</p>
          <div className="settings-grid">
            <label className="input-field">
              <span className="input-description">scheduling mode</span>
              <select
                className="input-card"
                value={adaptiveReviewScheduling ? "adaptive" : "fixed"}
                onChange={(event) => {
                  setAdaptiveReviewScheduling(event.target.value === "adaptive")
                  setSaved(false)
                }}
              >
                <option value="adaptive">Adaptive to result and mistake</option>
                <option value="fixed">Use only the default interval</option>
              </select>
            </label>

            <label className="input-field">
              <span className="input-description">default review interval (days)</span>
              <input
                className="input-card"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="No default"
                value={defaultReviewDays}
                onChange={(event) => {
                  setDefaultReviewDays(event.target.value)
                  setSaved(false)
                }}
              />
            </label>
          </div>
          <p className="settings-help">
            The default interval is used when adaptive scheduling has no recommendation, or for
            every new log when adaptive scheduling is off.
          </p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {saved && <p className="settings-saved" role="status">Settings saved.</p>}

        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={restoreDefaults}>
            Restore defaults
          </button>
          <button className="button-style" type="button" onClick={save}>
            Save settings
          </button>
        </div>
      </section>
    </>
  )
}

export default Settings
