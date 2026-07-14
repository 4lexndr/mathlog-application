import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import type { Problem, Attempt } from "./types.ts"
import {
  subjectOptions,
  resultOptions,
  mistakeTypeOptions,
  pressureLevelOptions,
} from "./types.ts"

import "./main.css"

type Option = { value: string; label: string }

function TextField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div className="field">
      <label className="field-label">{props.label}</label>
      <input
        type={props.type ?? 'text'}
        placeholder={`${props.label}...`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="input-small"
      />
    </div>
  )
}

function SelectField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Option[]
}) {
  return (
    <div className="field">
      <label className="field-label">{props.label}</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="input-small"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SliderField(props: {
  label: string
  value: number | string
  onChange: (value: string) => void
  min: number
  max: number
  step: number
}) {
  return (
    <div className="field">
      <label className="field-label">{props.label}</label>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="slider"
      />
    </div>
  )
}

function App() {
  const [year, setYear] = useState('')
  const [contest, setContest] = useState('')
  const [subcontest, setSubcontest] = useState('')
  const [problemNumber, setProblemNumber] = useState('')
  const [url, setUrl] = useState('')
  const [rating, setRating] = useState(1600)
  const [subject, setSubject] = useState('algebra')

  const [result, setResult] = useState('solved')
  const [timeSpent, setTimeSpent] = useState('5')
  const [mistakeType, setMistakeType] = useState('none')
  const [keyIdea, setKeyIdea] = useState('')
  const [pressureLevel, setPressureLevel] = useState('medium')

  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [problems, setProblems] = useState<Problem[]>([])

  // load saved problems and attempts on mount
  useEffect(() => {
    setProblems(JSON.parse(localStorage.getItem("problems") ?? "[]"))
    setAttempts(JSON.parse(localStorage.getItem("attempts") ?? "[]"))
  }, [])

  // save all inputs into localStorage
  function saveLog() {
    const existing = problems.find(
      (p) =>
        p.year === year &&
        p.contest === contest &&
        p.subcontest === subcontest &&
        p.problemNumber === problemNumber
    )

    const problemId = existing?.id ?? `prb-${nanoid(10)}`
    const nextProblems = existing
      ? problems
      : [
          ...problems,
          { id: problemId, year, contest, subcontest, problemNumber, url, rating: String(rating), subject },
        ]

    const attempt: Attempt = {
      id: `att-${nanoid(10)}`,
      problemId,
      date: new Date().toISOString().slice(0, 10),
      isReview: existing !== undefined,
      result,
      timeSpent,
      assistanceLevel: 'none',
      mistakeType,
      keyIdea,
      recognitionClue: '',
      pressureLevel,
    }
    const nextAttempts = [...attempts, attempt]

    localStorage.setItem("problems", JSON.stringify(nextProblems))
    localStorage.setItem("attempts", JSON.stringify(nextAttempts))
    setProblems(nextProblems)
    setAttempts(nextAttempts)
  }

  const timeLabel = `Time spent: ${Math.floor(Number(timeSpent) / 60)}h ${Number(timeSpent) % 60}m`

  function problemTitle(problemId: string) {
    const p = problems.find((p) => p.id === problemId)
    return p ? `${p.year} ${p.contest} ${p.subcontest} #${p.problemNumber}` : ''
  }

  return (
    <div id="root-wrapper">
      <div className="vert-wrapper">
        <h1>Welcome to mathlog!</h1>
        <h2>Log your problem below: </h2>

        <h3>Problem</h3>
        <TextField label="Year" value={year} onChange={setYear} />
        <TextField label="Contest" value={contest} onChange={setContest} />
        <TextField label="Subcontest" value={subcontest} onChange={setSubcontest} />
        <TextField label="Problem number" value={problemNumber} onChange={setProblemNumber} />
        <TextField label="URL" value={url} onChange={setUrl} type="url" />
        <SelectField label="Subject" value={subject} onChange={setSubject} options={subjectOptions} />
        <SliderField
          label={`Rating: ${rating}`}
          value={rating}
          onChange={(v) => setRating(Number(v))}
          min={1200}
          max={2100}
          step={50}
        />

        <h3>Attempt</h3>
        <SliderField label={timeLabel} value={timeSpent} onChange={setTimeSpent} min={0} max={90} step={5} />
        <SelectField label="Result" value={result} onChange={setResult} options={resultOptions} />
        {result !== 'independent' && (
          <SelectField label="Mistake type" value={mistakeType} onChange={setMistakeType} options={mistakeTypeOptions} />
        )}
        <TextField label="Key idea" value={keyIdea} onChange={setKeyIdea} />
        <SelectField label="Pressure level" value={pressureLevel} onChange={setPressureLevel} options={pressureLevelOptions} />

        <button onClick={saveLog} id="save-button">
          Save Problem
        </button>
      </div>

      <div className="vert-wrapper">
        <h1>Recent attempts</h1>
        {attempts.map((attempt) => (
          <div className="attempt-box" key={attempt.id}>
            <b>{problemTitle(attempt.problemId)}</b>
            <span>{attempt.date}</span>
            <span>{resultOptions.find((o) => o.value === attempt.result)?.label ?? attempt.result}</span>
            <span>{attempt.isReview ? 'Review' : 'First attempt'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
