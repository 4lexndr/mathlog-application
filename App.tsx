import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import type { Problem, Attempt } from "./types.ts"
import {
  subjectOptions,
  resultOptions,
  assistanceLevelOptions, 
  mistakeTypeOptions, 
  pressureLevelOptions,
} from "./types.ts"

import "./main.css"

// read file from user's computer
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function App() {
  const [source, setSource] = useState('')
  const [url, setUrl] = useState('')
  const [rating, setRating] = useState(1600)
  const [subject, setSubject] = useState('algebra')
  const [screenshot, setScreenshot] = useState('')

  const [result, setResult] = useState('solved')
  const [timeSpent, setTimeSpent] = useState('5')
  const [assistanceLevel, setAssistanceLevel] = useState('none')
  const [mistakeType, setMistakeType] = useState('none')
  const [keyIdea, setKeyIdea] = useState('')
  const [recognitionClue, setRecognitionClue] = useState('')
  const [pressureLevel, setPressureLevel] = useState('medium')

  // handle paste
  useEffect(() => {
    async function handlePaste(event: ClipboardEvent) {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) setScreenshot(await fileToDataUrl(file))
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) setScreenshot(await fileToDataUrl(file))
  }

  // save all inputs into localStorage
  function saveLog(){
    const problems: Problem[] = JSON.parse(localStorage.getItem("problems") ?? "[]")
    const attempts: Attempt[] = JSON.parse(localStorage.getItem("attempts") ?? "[]")

    // a problem is identified by its URL, falling back to its source when blank.
    // if we've logged it before, this is a review; otherwise it's a first attempt.
    const identity = url.trim() || source.trim()
    const existing = identity
      ? problems.find((p) => (p.url.trim() || p.source.trim()) === identity)
      : undefined
    const isReview = existing !== undefined

    let problemId: string
    if (existing) {
      problemId = existing.id
    } else {
      problemId = `prb-${nanoid()}`
      const problem: Problem = {
        id: problemId,
        source,
        url,
        rating: String(rating),
        subject,
        screenshot,
      }
      problems.push(problem)
    }

    const attempt: Attempt = {
      id: `att-${nanoid()}`,
      problem_id: problemId,
      date: new Date().toISOString().slice(0, 10),
      is_review: isReview,
      result,
      time_spent: timeSpent,
      assistance_level: assistanceLevel,
      mistake_type: mistakeType,
      key_idea: keyIdea,
      recognition_clue: recognitionClue,
      pressure_level: pressureLevel,
    }
    attempts.push(attempt)

    localStorage.setItem("problems", JSON.stringify(problems))
    localStorage.setItem("attempts", JSON.stringify(attempts))
  }

  return (
    <>
      <h1>Welcome to mathlog!</h1>
      <h2>Log your problem below: </h2>
      <div className="vert">
        <h3>Problem</h3>
        <div className="field">
          <label className="field-label">Source</label>
          <input
            type='text'
            placeholder="Source..."
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="input-small"
          />
        </div>
        <div className="field">
          <label className="field-label">URL</label>
          <input
            type='url'
            placeholder="URL..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="input-small"
          />
        </div>
        <div className="field">
          <label className="field-label">Subject</label>
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="input-small"
          >
            {subjectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Rating: {rating}</label>
          <input
            type="range"
            min="1200"
            max="2100"
            step="50"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            id="rating-slider"
          />
        </div>
        <div className="field">
          <label className="field-label">Screenshot</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="input-small"
          />
          {screenshot && (
            <div className="screenshot-preview">
              <img src={screenshot} alt="Problem screenshot" />
              <button type="button" onClick={() => setScreenshot('')}>
                Remove
              </button>
            </div>
          )}
        </div>

        <h3>Attempt</h3>
        <div className="field">
          <label className="field-label">Time spent: {Math.floor(timeSpent / 60)}h {timeSpent % 60}m</label>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={timeSpent}
            onChange={(event) => setTimeSpent(Number(event.target.value))}
            id="rating-slider"
          />
        </div>
        <div className="field">
          <label className="field-label">Result</label>
          <select
            value={result}
            onChange={(event) => setResult(event.target.value)}
            className="input-small"
          >
            {resultOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {result !== 'independent' && ( <div className="field">
            <label className="field-label">Mistake type</label>
            <select
              value={mistakeType}
              onChange={(event) => setMistakeType(event.target.value)}
              className="input-small"
            >
              {mistakeTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label className="field-label">Key idea</label>
          <input
            type='text'
            placeholder="Key idea..."
            value={keyIdea}
            onChange={(event) => setKeyIdea(event.target.value)}
            className="input-small"
          />
        </div>
        <div className="field">
          <label className="field-label">Pressure level</label>
          <select
            value={pressureLevel}
            onChange={(event) => setPressureLevel(event.target.value)}
            className="input-small"
          >
            {pressureLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={saveLog}
          id="save-button"
        >
          Save Problem
        </button>
      </div>
    </>
  )
}

export default App
