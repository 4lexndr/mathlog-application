import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import type { Attempt, AttemptResult, MathlogStore, PressureLevel, Problem, Subject } from './types'
import {
  mistakeTypeOptions,
  pressureLevelOptions,
  resultOptions,
  subjectOptions,
} from './types'
import {
  createAttempt,
  createProblem,
  findMatchingProblem,
  getAttemptNumber,
  isReviewAttempt,
  loadStore,
  saveStore,
} from './storage'

type Route = { page: 'log' } | { page: 'history' } | { page: 'attempt'; id: string }

type Draft = {
  reference: string
  url: string
  subject: Subject
  screenshot: string

  result: AttemptResult
  durationMinutes: number
  perceivedRating: number
  mistakeType: string
  keyIdea: string
  recognitionClue: string
  pressureLevel: PressureLevel
}

const freshDraft = (): Draft => ({
  reference: '',
  url: '',
  subject: 'algebra',
  screenshot: '',
  result: 'independent',
  durationMinutes: 30,
  perceivedRating: 1600,
  mistakeType: '',
  keyIdea: '',
  recognitionClue: '',
  pressureLevel: 'medium',
})

function readRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, '')
  if (path === 'history') return { page: 'history' }
  if (path.startsWith('attempt/')) return { page: 'attempt', id: path.slice('attempt/'.length) }
  return { page: 'log' }
}

function navigate(path: string) {
  window.location.hash = path
}

// read an uploaded or pasted image into a data URL
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// turn a raw-minute duration into xh:ym
function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h${remainder ? ` ${remainder}m` : ''}`
}

/**
 * Format an ISO timestamp using the learner's own locale.
 * Detail pages can request the time; compact history rows show only the date.
 */
function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

/**
 * Look up the visible label for a saved option value.
 * Falling back to the raw value keeps older or unexpected saved data readable.
 */
function labelFor<T extends string>(options: { value: T; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

/**
 * Shared frame used by all three pages.
 *
 * The selected navigation item is based on the current route. Attempt details
 * count as part of History because they are reached from and belong to that area.
 */
function Shell({ route, children }: { route: Route; children: React.ReactNode }) {
  return (
    <div className="app-shell">
      {/* The compact header replaces the previous large welcome block and keeps navigation available while scrolling. */}
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate('log')} aria-label="Mathlog home">
          <span className="brand-mark" aria-hidden="true">m</span>
          <span>mathlog</span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={route.page === 'log' ? 'nav-link active' : 'nav-link'}
            type="button"
            onClick={() => navigate('log')}
          >
            New attempt
          </button>
          <button
            className={route.page !== 'log' ? 'nav-link active' : 'nav-link'}
            type="button"
            onClick={() => navigate('history')}
          >
            History
          </button>
        </nav>
      </header>
      {/* Each selected page is passed to Shell as children so the header is not duplicated. */}
      <main>{children}</main>
    </div>
  )
}

/** A reusable number-and-label pair used in both page summaries. */
function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

/**
 * Friendly placeholder shown before any attempts exist.
 * The sidebar requests a compact version; the full History page includes a call
 * to action that takes the learner directly to the form.
 */
function EmptyHistory({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'empty-state compact' : 'empty-state'}>
      <span className="empty-glyph" aria-hidden="true">∴</span>
      <h3>No attempts yet</h3>
      <p>Your solved, stuck, and reviewed problems will collect here.</p>
      {!compact && <button className="button secondary" type="button" onClick={() => navigate('log')}>Log the first one</button>}
    </div>
  )
}

/**
 * One clickable attempt summary reused by Recent Attempts and the full history.
 *
 * Review status is calculated from the complete attempts array rather than read
 * from a stored `is_review` flag. This keeps the label truthful after migration
 * and makes the Problem-to-Attempts relationship the single source of truth.
 */
function AttemptRow({ attempt, problem, attempts }: { attempt: Attempt; problem?: Problem; attempts: Attempt[] }) {
  // Translate the compact stored result value into the short label that fits a row.
  const result = resultOptions.find((option) => option.value === attempt.result)

  // An attempt is a review when another attempt on the same Problem came before it.
  const review = isReviewAttempt(attempt, attempts)

  return (
    <button className="attempt-row" type="button" onClick={() => navigate(`attempt/${attempt.id}`)}>
      <span className={`result-dot result-${attempt.result}`} aria-hidden="true" />
      <span className="attempt-main">
        <strong>{problem?.reference || 'Untitled problem'}</strong>
        <span>{labelFor(subjectOptions, problem?.subject ?? '')} · {formatDuration(attempt.durationMinutes)}</span>
      </span>
      <span className="attempt-outcome">{result?.shortLabel ?? attempt.result}</span>
      <span className="attempt-kind">{review ? `Review ${getAttemptNumber(attempt, attempts) - 1}` : 'First try'}</span>
      <span className="attempt-date">{formatDate(attempt.attemptedAt)}</span>
      <span className="row-arrow" aria-hidden="true">↗</span>
    </button>
  )
}

/**
 * The primary New Attempt page.
 *
 * It presents one continuous form, but visually separates stable Problem details
 * from the details of today's Attempt. It also shows an identity match before
 * saving, so automatic review detection is understandable rather than invisible.
 */
function LogPage({ store, onSave, prefill }: {
  store: MathlogStore
  onSave: (draft: Draft, forceNew: boolean) => Attempt
  prefill: Draft | null
}) {
  // `draft` contains every editable field until the form is submitted.
  const [draft, setDraft] = useState<Draft>(prefill ?? freshDraft)

  // The learner can override a suggested match when two similar references are actually different problems.
  const [forceNew, setForceNew] = useState(false)

  // Validation and file errors appear next to the form instead of using disruptive browser alerts.
  const [error, setError] = useState('')

  // This state adds visual feedback while a file is being dragged over the image target.
  const [isDragging, setIsDragging] = useState(false)

  // The real file input is visually hidden; this reference lets the designed upload control open it.
  const fileInput = useRef<HTMLInputElement>(null)

  /**
   * "Log another attempt" supplies an existing Problem as `prefill`.
   * Copying that value into the draft preserves the identity fields while leaving
   * all Attempt-specific answers at their fresh defaults.
   */
  useEffect(() => {
    if (prefill) setDraft(prefill)
  }, [prefill])

  /**
   * Listen for pasted clipboard images while the form is open.
   * This makes taking a screenshot and pressing Paste an alternative to browsing
   * for a file. The cleanup removes the global listener when this page unmounts.
   */
  useEffect(() => {
    async function handlePaste(event: ClipboardEvent) {
      const image = [...(event.clipboardData?.items ?? [])].find((item) => item.type.startsWith('image/'))
      const file = image?.getAsFile()
      if (file) {
        const screenshot = await fileToDataUrl(file)
        setDraft((current) => ({ ...current, screenshot }))
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  /**
   * Ask storage.ts whether the current URL or reference identifies a saved Problem.
   *
   * Crucially, only the identity fields participate in that helper. Perceived
   * rating, subject, result, and reflection cannot create a duplicate. useMemo
   * avoids repeating the search unless the draft or problem list actually changes.
   */
  const matchedProblem = useMemo(
    () => forceNew ? undefined : findMatchingProblem(store.problems, draft),
    [draft, forceNew, store.problems],
  )

  // The count is used to explain exactly which review number will be created.
  const previousAttempts = matchedProblem
    ? store.attempts.filter((attempt) => attempt.problemId === matchedProblem.id).length
    : 0

  // Keep the sidebar focused by showing only the four newest saved attempts.
  const recentAttempts = [...store.attempts].sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt)).slice(0, 4)

  /**
   * Update any draft field through one typed helper.
   *
   * Editing the URL or reference cancels a previous "not the same" override so the
   * revised identity can be checked again. Any edit also clears an old error after
   * the learner has had a chance to correct it.
   */
  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (key === 'reference' || key === 'url') setForceNew(false)
    setError('')
  }

  /** Validate an uploaded/dropped file and store its displayable data URL in the draft. */
  async function acceptImage(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    update('screenshot', await fileToDataUrl(file))
  }

  /**
   * Validate the minimum identity information, save through the root component,
   * and open the new attempt's detail page so the learner receives a clear result.
   */
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.reference.trim() && !draft.url.trim()) {
      setError('Add a problem reference or URL so it can be recognized next time.')
      return
    }
    const attempt = onSave(draft, forceNew)
    navigate(`attempt/${attempt.id}`)
  }

  return (
    <div className="page page-log">
      {/* A plain heading keeps the dashboard close to the directness of the original version. */}
      <h1 className="dashboard-title">Log an attempt</h1>

      {/* Like the original dashboard, the form stays on the left and recent attempts stay on the right. */}
      <div className="log-layout">
        <form className="log-form" onSubmit={submit}>
          {/* The first card contains only information that should remain stable across reviews of one Problem. */}
          <section className="form-card">
            <div className="section-heading">
              <h2>Problem</h2>
            </div>

            <div className="field-grid two-columns">
              {/* Reference replaces the vague old "Source" field and gives reference-only problems a usable identity. */}
              <label className="field wide">
                <span>Problem reference</span>
                <input
                  type="text"
                  value={draft.reference}
                  onChange={(event) => update('reference', event.target.value)}
                  placeholder="e.g. 2024 AIME I · Problem 8"
                />
              </label>
              {/* URL is optional, but when supplied it is normalized and used as the strongest identity signal. */}
              <label className="field wide">
                <span>Problem URL <em>optional</em></span>
                <input
                  type="url"
                  value={draft.url}
                  onChange={(event) => update('url', event.target.value)}
                  placeholder="https://…"
                />
              </label>
              {/* Subject describes the Problem; it is intentionally not used to decide whether two problems match. */}
              <label className="field">
                <span>Subject</span>
                <select value={draft.subject} onChange={(event) => update('subject', event.target.value as Subject)}>
                  {subjectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {/* The image control supports file selection, dragging, and the page-level paste listener above. */}
              <div className="field">
                <span>Problem image <em>optional</em></span>
                <input
                  ref={fileInput}
                  className="visually-hidden"
                  id="problem-image"
                  type="file"
                  accept="image/*"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => void acceptImage(event.target.files?.[0])}
                />
                {/* Show a thumbnail and removal action after an image has been accepted; otherwise show the drop target. */}
                {draft.screenshot ? (
                  <div className="image-preview">
                    <img src={draft.screenshot} alt="Problem preview" />
                    <button type="button" onClick={() => update('screenshot', '')}>Remove</button>
                  </div>
                ) : (
                  <button
                    className={isDragging ? 'upload-box dragging' : 'upload-box'}
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    onDragEnter={() => setIsDragging(true)}
                    onDragLeave={() => setIsDragging(false)}
                    onDragOver={(event: DragEvent) => event.preventDefault()}
                    onDrop={(event: DragEvent) => {
                      event.preventDefault()
                      setIsDragging(false)
                      void acceptImage(event.dataTransfer.files[0])
                    }}
                  >
                    <span aria-hidden="true">＋</span> Add or paste image
                  </button>
                )}
              </div>
            </div>

            {/*
              Matching is shown before submission. This directly explains why the next save will be
              a review and reassures the learner that rating or outcome will not split the history.
            */}
            {matchedProblem && (
              <div className="match-notice" role="status">
                <span className="match-icon" aria-hidden="true">✓</span>
                <div>
                  <strong>Matched: {matchedProblem.reference}</strong>
                  <p>{previousAttempts ? `This will be review ${previousAttempts}.` : 'This will be the first attempt.'}</p>
                </div>
                <button type="button" onClick={() => setForceNew(true)}>Not the same?</button>
              </div>
            )}

            {/* A learner-controlled override handles rare false positives without weakening automatic matching. */}
            {forceNew && (
              <div className="new-record-notice" role="status">
                A separate problem will be created. <button type="button" onClick={() => setForceNew(false)}>Use the match instead</button>
              </div>
            )}
          </section>

          {/* The second card contains information that may legitimately change on every Attempt. */}
          <section className="form-card">
            <div className="section-heading">
              <h2>Attempt</h2>
            </div>

            {/* The five result choices replace overlapping result and assistance fields with one consistent answer. */}
            <fieldset className="field fieldset-reset">
              <legend>Outcome</legend>
              <div className="choice-grid outcome-grid">
                {resultOptions.map((option) => (
                  <label className={draft.result === option.value ? 'choice selected' : 'choice'} key={option.value}>
                    <input
                      className="visually-hidden"
                      type="radio"
                      name="result"
                      value={option.value}
                      checked={draft.result === option.value}
                      onChange={() => update('result', option.value)}
                    />
                    <span className={`choice-dot result-${option.value}`} />
                    {option.shortLabel}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Time, perceived rating, and pressure describe only this sitting, not the permanent Problem. */}
            <div className="field-grid three-columns metrics-grid">
              <label className="field range-field">
                <span>Time spent <strong>{formatDuration(draft.durationMinutes)}</strong></span>
                <input
                  type="range"
                  min="5"
                  max="180"
                  step="5"
                  value={draft.durationMinutes}
                  onChange={(event) => update('durationMinutes', Number(event.target.value))}
                />
              </label>
              <label className="field range-field">
                <span>Perceived rating <strong>{draft.perceivedRating}</strong></span>
                <input
                  type="range"
                  min="800"
                  max="3000"
                  step="50"
                  value={draft.perceivedRating}
                  onChange={(event) => update('perceivedRating', Number(event.target.value))}
                />
              </label>
              <fieldset className="field fieldset-reset">
                <legend>Pressure</legend>
                <div className="segmented-control">
                  {pressureLevelOptions.map((option) => (
                    <label className={draft.pressureLevel === option.value ? 'selected' : ''} key={option.value}>
                      <input
                        className="visually-hidden"
                        type="radio"
                        name="pressure"
                        checked={draft.pressureLevel === option.value}
                        onChange={() => update('pressureLevel', option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* A breakdown diagnosis is useful only when the problem was not solved independently. */}
            {draft.result !== 'independent' && (
              <label className="field">
                <span>Where did it break down? <em>optional</em></span>
                <select value={draft.mistakeType} onChange={(event) => update('mistakeType', event.target.value)}>
                  <option value="">Choose a pattern</option>
                  {mistakeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}

            {/* Both reflection fields are now visible; recognitionClue existed before but was not presented in the old form. */}
            <div className="field-grid two-columns reflection-grid">
              <label className="field">
                <span>Key idea</span>
                <textarea
                  value={draft.keyIdea}
                  onChange={(event) => update('keyIdea', event.target.value)}
                  placeholder="What unlocked the problem?"
                  rows={3}
                />
              </label>
              <label className="field">
                <span>Recognition clue</span>
                <textarea
                  value={draft.recognitionClue}
                  onChange={(event) => update('recognitionClue', event.target.value)}
                  placeholder="What signal should you notice next time?"
                  rows={3}
                />
              </label>
            </div>
          </section>

          {/* Keep validation close to the save action. */}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="button primary" type="submit">Save attempt <span aria-hidden="true">→</span></button>
          </div>
        </form>

        {/* The sidebar gives immediate access to recent work without crowding the main form. */}
        <aside className="recent-panel">
          <div className="aside-heading">
            <h2>Recent attempts</h2>
            {recentAttempts.length > 0 && <button type="button" onClick={() => navigate('history')}>View all</button>}
          </div>
          {recentAttempts.length === 0 ? <EmptyHistory compact /> : (
            <div className="recent-list">
              {recentAttempts.map((attempt) => (
                <AttemptRow
                  key={attempt.id}
                  attempt={attempt}
                  problem={store.problems.find((problem) => problem.id === attempt.problemId)}
                  attempts={store.attempts}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

/**
 * Full archive for browsing past attempts.
 *
 * This page is separate from the logging form so a growing history does not make
 * the primary task feel crowded. Search and outcome filtering are intentionally
 * local and immediate because all data already lives on this device.
 */
function HistoryPage({ store }: { store: MathlogStore }) {
  // Free-text search covers both stable Problem information and written Attempt reflections.
  const [query, setQuery] = useState('')

  // "all" is a UI-only option; every saved Attempt still has a concrete AttemptResult.
  const [resultFilter, setResultFilter] = useState<'all' | AttemptResult>('all')

  // A Map avoids repeatedly scanning the problems array while rendering or searching many attempts.
  const problemById = useMemo(() => new Map(store.problems.map((problem) => [problem.id, problem])), [store.problems])

  /**
   * Apply the selected outcome, then the case-insensitive text query, then sort
   * newest first. Copying with [...] prevents sort() from changing saved order.
   */
  const attempts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return [...store.attempts]
      .filter((attempt) => resultFilter === 'all' || attempt.result === resultFilter)
      .filter((attempt) => {
        if (!normalizedQuery) return true
        const problem = problemById.get(attempt.problemId)
        return [problem?.reference, problem?.url, problem?.subject, attempt.keyIdea, attempt.recognitionClue]
          .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
      })
      .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
  }, [problemById, query, resultFilter, store.attempts])

  // As elsewhere, reviews are derived from the Problem thread rather than trusted from a saved flag.
  const reviewCount = store.attempts.filter((attempt) => isReviewAttempt(attempt, store.attempts)).length

  return (
    <div className="page history-page">
      {/* Page-level heading and the main action remain visible before the archive controls. */}
      <section className="page-heading history-heading">
        <div>
          <h1>History</h1>
        </div>
        <button className="button primary" type="button" onClick={() => navigate('log')}>＋ New attempt</button>
      </section>

      {/* These totals turn the archive into a quick practice overview rather than a plain list. */}
      <section className="history-summary">
        <Stat value={store.attempts.length} label="total attempts" />
        <Stat value={store.problems.length} label="unique problems" />
        <Stat value={reviewCount} label="reviews" />
        <Stat
          value={store.attempts.reduce((sum, attempt) => sum + attempt.durationMinutes, 0) ? formatDuration(store.attempts.reduce((sum, attempt) => sum + attempt.durationMinutes, 0)) : '—'}
          label="practice time"
        />
      </section>

      {/* Search, filtering, empty states, and results share one quiet off-white card. */}
      <section className="history-card">
        <div className="history-tools">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems or notes" aria-label="Search history" />
          </label>
          <label className="filter-field">
            <span>Outcome</span>
            <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value as 'all' | AttemptResult)}>
              <option value="all">All outcomes</option>
              {resultOptions.map((option) => <option key={option.value} value={option.value}>{option.shortLabel}</option>)}
            </select>
          </label>
        </div>
        {/* Distinguish "nothing has been logged" from "the current filters found nothing." */}
        {store.attempts.length === 0 ? <EmptyHistory /> : attempts.length === 0 ? (
          <div className="empty-state"><span className="empty-glyph">⌕</span><h3>No matching attempts</h3><p>Try a different search or outcome.</p></div>
        ) : (
          <div className="attempt-table">
            <div className="attempt-table-head" aria-hidden="true">
              <span>Problem</span><span>Outcome</span><span>Visit</span><span>Date</span><span />
            </div>
            {attempts.map((attempt) => (
              <AttemptRow key={attempt.id} attempt={attempt} problem={problemById.get(attempt.problemId)} attempts={store.attempts} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/** Small label/value block reused by the outcome summary on an attempt detail page. */
function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="detail-item"><span>{label}</span><strong>{children}</strong></div>
}

/**
 * Detailed view of one saved Attempt.
 *
 * The page joins the selected Attempt to its stable Problem using problemId. It
 * then shows the current sitting in full and every sibling attempt in a timeline,
 * making the reason for retaining a lightweight Problem record visible to users.
 */
function AttemptPage({ store, route, onLogAgain }: { store: MathlogStore; route: Extract<Route, { page: 'attempt' }>; onLogAgain: (problem: Problem) => void }) {
  // First find the requested Attempt from the ID in the hash route.
  const attempt = store.attempts.find((item) => item.id === route.id)

  // Then follow its problemId to retrieve the shared reference, URL, subject, and image.
  const problem = attempt ? store.problems.find((item) => item.id === attempt.problemId) : undefined

  // Saved browser data can be manually cleared, so a missing record gets a safe recovery page.
  if (!attempt || !problem) {
    return (
      <div className="page missing-page">
        <span className="empty-glyph">?</span>
        <h1>Attempt not found</h1>
        <p>It may have been removed from this browser.</p>
        <button className="button primary" type="button" onClick={() => navigate('history')}>Back to history</button>
      </div>
    )
  }

  // The chronological number determines whether the selected record is the first try or a later review.
  const number = getAttemptNumber(attempt, store.attempts)

  // Every Attempt linked to this Problem becomes the newest-first timeline at the side.
  const siblingAttempts = store.attempts
    .filter((item) => item.problemId === problem.id)
    .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))

  return (
    <div className="page attempt-page">
      <button className="back-link" type="button" onClick={() => navigate('history')}>← Back to history</button>
      {/* Stable Problem identity heads the page; the date and review badge describe this selected Attempt. */}
      <section className="attempt-hero">
        <div>
          <div className="attempt-badges">
            <span>{labelFor(subjectOptions, problem.subject)}</span>
            <span>{number > 1 ? `Review ${number - 1}` : 'First attempt'}</span>
          </div>
          <h1>{problem.reference}</h1>
          <p>{formatDate(attempt.attemptedAt, true)}</p>
        </div>
        <div className="hero-actions">
          {/* The external link only appears when the optional URL exists. */}
          {problem.url && <a className="button secondary" href={problem.url} target="_blank" rel="noreferrer">Open problem ↗</a>}
          {/* This action reuses only stable Problem details and starts a clean Attempt form. */}
          <button className="button primary" type="button" onClick={() => onLogAgain(problem)}>Log another attempt</button>
        </div>
      </section>

      <div className="attempt-detail-layout">
        <div className="detail-main">
          {/* Outcome and metrics are grouped because all four describe the same sitting. */}
          <section className="detail-card outcome-card">
            <div className={`outcome-symbol result-${attempt.result}`} aria-hidden="true">{attempt.result === 'independent' ? '✓' : '↗'}</div>
            <div>
              <p className="detail-label">Outcome</p>
              <h2>{labelFor(resultOptions, attempt.result)}</h2>
            </div>
            <div className="detail-metrics">
              <DetailItem label="Time">{formatDuration(attempt.durationMinutes)}</DetailItem>
              <DetailItem label="Perceived rating">{attempt.perceivedRating}</DetailItem>
              <DetailItem label="Pressure">{labelFor(pressureLevelOptions, attempt.pressureLevel)}</DetailItem>
            </div>
          </section>

          {/* Reflection preserves the useful learning content instead of reducing history to success/failure statistics. */}
          <section className="detail-card reflection-card">
            <div className="section-title-row"><h2>Reflection</h2></div>
            <div className="reflection-detail-grid">
              <div>
                <span>Key idea</span>
                <p>{attempt.keyIdea || 'No key idea was recorded.'}</p>
              </div>
              <div>
                <span>Recognition clue</span>
                <p>{attempt.recognitionClue || 'No recognition clue was recorded.'}</p>
              </div>
            </div>
            {/* Hide an empty mistake section rather than filling the page with a meaningless placeholder. */}
            {attempt.mistakeType && (
              <div className="breakdown-note"><span>Breakdown pattern</span><strong>{labelFor(mistakeTypeOptions, attempt.mistakeType)}</strong></div>
            )}
          </section>

          {/* The Problem image is shared across reviews and rendered only when one was originally supplied. */}
          {problem.screenshot && (
            <section className="detail-card problem-image-card">
              <div className="section-title-row"><h2>Problem image</h2></div>
              <img src={problem.screenshot} alt={`Problem: ${problem.reference}`} />
            </section>
          )}
        </div>

        {/* The thread proves that multiple Attempt records belong to one recognized Problem. */}
        <aside className="problem-thread">
          <p className="detail-label">Problem thread</p>
          <h2>{siblingAttempts.length} {siblingAttempts.length === 1 ? 'attempt' : 'attempts'}</h2>
          <div className="timeline">
            {siblingAttempts.map((item) => {
              // Calculate each row's own visit number so its label remains accurate in the complete thread.
              const itemNumber = getAttemptNumber(item, store.attempts)
              return (
                <button className={item.id === attempt.id ? 'timeline-item active' : 'timeline-item'} type="button" key={item.id} onClick={() => navigate(`attempt/${item.id}`)}>
                  <span className={`timeline-dot result-${item.result}`} />
                  <span><strong>{itemNumber > 1 ? `Review ${itemNumber - 1}` : 'First attempt'}</strong><small>{formatDate(item.attemptedAt)} · {resultOptions.find((option) => option.value === item.result)?.shortLabel}</small></span>
                </button>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}

/**
 * Root application controller.
 *
 * App owns the saved store because every page needs a consistent snapshot. Child
 * pages receive read-only data plus narrowly scoped actions, which keeps saving
 * rules in one place and prevents different pages from writing incompatible data.
 */
function App() {
  /**
   * Load browser data once during initial rendering.
   * loadStore also performs the automatic legacy migration and duplicate cleanup,
   * so every component below can work exclusively with the cleaned version-2 type.
   */
  const [store, setStore] = useState<MathlogStore>(() => loadStore())

  // Read the current hash immediately so refreshing a detail/history URL stays on that page.
  const [route, setRoute] = useState<Route>(() => readRoute())

  // This temporary value carries stable Problem fields into "Log another attempt."
  const [prefill, setPrefill] = useState<Draft | null>(null)

  /** Keep React in sync when navigation, Back, or Forward changes the browser hash. */
  useEffect(() => {
    const handleRoute = () => setRoute(readRoute())
    window.addEventListener('hashchange', handleRoute)
    return () => window.removeEventListener('hashchange', handleRoute)
  }, [])

  /**
   * Turn the combined form draft into the clean stored model.
   *
   * 1. Reuse a matching Problem unless the learner explicitly rejected the match.
   * 2. Create one new Attempt every time, because every submission is a new sitting.
   * 3. Put perceived rating and all other changing details on that Attempt.
   * 4. Save the complete next store and mirror it into React state.
   */
  function saveAttempt(draft: Draft, forceNew: boolean) {
    // Matching considers the normalized URL/reference only; rating and outcome are absent from this call.
    const matched = forceNew ? undefined : findMatchingProblem(store.problems, draft)

    // A new Problem is created only when no existing identity matched or matching was overridden.
    const problem = matched ?? createProblem(draft)

    // A fresh Attempt always points to the chosen Problem thread.
    const attempt = createAttempt({
      problemId: problem.id,
      result: draft.result,
      durationMinutes: draft.durationMinutes,
      perceivedRating: draft.perceivedRating,
      mistakeType: draft.result === 'independent' ? undefined : draft.mistakeType || undefined,
      keyIdea: draft.keyIdea.trim(),
      recognitionClue: draft.recognitionClue.trim(),
      pressureLevel: draft.pressureLevel,
    })

    // Reuse the existing problems array after a match; otherwise append exactly one new Problem.
    const nextStore: MathlogStore = {
      version: 2,
      problems: matched ? store.problems : [...store.problems, problem],
      attempts: [...store.attempts, attempt],
    }

    // Persist first, then update the visible interface with the identical object.
    saveStore(nextStore)
    setStore(nextStore)
    setPrefill(null)
    return attempt
  }

  /**
   * Start a review from an existing Problem.
   *
   * Only stable fields are copied. Result, time, perceived rating, mistake,
   * reflection, and pressure come from freshDraft so the old Attempt is never
   * accidentally duplicated into the new one.
   */
  function logAgain(problem: Problem) {
    setPrefill({
      ...freshDraft(),
      reference: problem.reference,
      url: problem.url,
      subject: problem.subject,
      screenshot: problem.screenshot ?? '',
    })
    navigate('log')
  }

  return (
    <Shell route={route}>
      {/* Render exactly one page for the current lightweight route. */}
      {route.page === 'log' && <LogPage store={store} onSave={saveAttempt} prefill={prefill} />}
      {route.page === 'history' && <HistoryPage store={store} />}
      {route.page === 'attempt' && <AttemptPage store={store} route={route} onLogAgain={logAgain} />}
    </Shell>
  )
}

export default App
