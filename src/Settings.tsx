import { useState } from "react"
import { contestStatusOptions, subjectOptions } from "./types.ts"
import type { AppSettings } from "./storage.ts"
import { DEFAULT_APP_SETTINGS } from "./storage.ts"

interface SettingsProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

function Settings({ settings, onSave }: SettingsProps) {
  const [defaultSubject, setDefaultSubject] = useState(settings.defaultSubject)
  const [defaultRating, setDefaultRating] = useState(settings.defaultRating)
  const [defaultContestStatus, setDefaultContestStatus] = useState(settings.defaultContestStatus)
  const [saved, setSaved] = useState(false)

  function restoreDefaults() {
    // Restore the controls first; the user still chooses when to save them.
    setDefaultSubject(DEFAULT_APP_SETTINGS.defaultSubject)
    setDefaultRating(DEFAULT_APP_SETTINGS.defaultRating)
    setDefaultContestStatus(DEFAULT_APP_SETTINGS.defaultContestStatus)
    setSaved(false)
  }

  function save() {
    onSave({
      defaultSubject,
      defaultRating,
      defaultContestStatus,
    })
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
