/**
 * This file contains the shared vocabulary for Mathlog.
 *
 * The most important design decision is the separation between a Problem and an
 * Attempt:
 *
 * - A Problem is the stable thing being worked on. Its contest reference, URL,
 *   subject, and image usually stay the same across multiple visits.
 * - An Attempt is one specific sitting with that problem. Its time, outcome,
 *   perceived rating, pressure, and reflection can be different every time.
 *
 * Keeping those concepts separate lets the app show a history of reviews without
 * creating a duplicate Problem just because the learner gave it a different
 * perceived rating on a later day.
 */

/**
 * The allowed branches of mathematics.
 *
 * A union type is used instead of a general string so that a misspelling cannot
 * silently enter saved data. It also keeps the select menu and stored values in
 * agreement.
 */
export type Subject = 'algebra' | 'combinatorics' | 'geometry' | 'number-theory'

/**
 * The allowed outcomes for one attempt.
 *
 * The old interface had a separate assistance level that overlapped with the
 * result. These five outcomes now communicate both completion and assistance in
 * one field, which removes that inconsistency.
 */
export type AttemptResult =
  | 'independent'
  | 'tiny-hint'
  | 'large-hint'
  | 'partial-solution'
  | 'full-solution'

/** The three deliberately simple pressure choices shown in the attempt form. */
export type PressureLevel = 'low' | 'medium' | 'high'

/**
 * Stable information shared by every attempt at the same problem.
 *
 * A Problem is still useful even though most of the app is centered on attempts:
 * its ID is the thread that connects a first attempt with all future reviews.
 * Only identity-like information belongs here. In particular, perceived rating
 * does not belong here because the same problem can feel different over time.
 */
export interface Problem {
  /** A permanent local identifier used by Attempt.problemId. */
  id: string

  /**
   * A human-readable identifier such as "2024 AIME I · Problem 8".
   * This replaced the ambiguous old name "source" because the value is meant to
   * identify the actual problem, not merely name the website it came from.
   */
  reference: string

  /** The optional original web address. It is also the strongest matching key. */
  url: string

  /** The mathematical subject used for labels, browsing, and future analysis. */
  subject: Subject

  /**
   * An optional image stored as a browser-readable data URL.
   * It is attached to the Problem so every review can reuse the same image.
   */
  screenshot?: string

  /**
   * A lowercase, punctuation-insensitive version of reference.
   * Saving it makes identity matching predictable and easy to inspect.
   */
  normalizedReference: string

  /**
   * A canonical form of the URL with superficial differences removed.
   * For example, protocol, "www", a trailing slash, and tracking parameters do
   * not need to make two otherwise identical links count as different problems.
   */
  normalizedUrl: string

  /** ISO timestamp for when this stable problem record was first created. */
  createdAt: string
}

/**
 * Information that can change every time a problem is attempted.
 *
 * Review status is intentionally not stored here. The app derives "first try" or
 * "review" by ordering all attempts with the same problemId. That prevents a
 * saved boolean from becoming incorrect if data is migrated or reordered.
 */
export interface Attempt {
  /** A permanent local identifier used by the attempt-detail page. */
  id: string

  /** The Problem thread this attempt belongs to. */
  problemId: string

  /** Exact ISO date and time when the attempt was saved. */
  attemptedAt: string

  /** The combined completion-and-assistance outcome selected in the form. */
  result: AttemptResult

  /** Time spent on this sitting, stored as a number to avoid old string math issues. */
  durationMinutes: number

  /**
   * How difficult the problem felt during this particular attempt.
   * This is intentionally on Attempt, so changing it never creates a new Problem.
   */
  perceivedRating: number

  /** Optional diagnosis of where a non-independent attempt broke down. */
  mistakeType?: string

  /** The mathematical observation or technique that unlocked the solution. */
  keyIdea: string

  /** A signal the learner wants to recognize earlier on a future review. */
  recognitionClue: string

  /** The amount of time or performance pressure felt during this sitting. */
  pressureLevel: PressureLevel
}

/**
 * The complete versioned object saved in browser storage.
 *
 * Problems and attempts are saved together so the two collections cannot drift
 * into unrelated versions. The literal version number lets storage.ts recognize
 * this format and migrate the older separate arrays safely.
 */
export interface MathlogStore {
  /** Version 2 is the first format with the cleaned Problem/Attempt separation. */
  version: 2

  /** One entry for every unique, recognized problem. */
  problems: Problem[]

  /** One entry for every logged sitting, including reviews. */
  attempts: Attempt[]
}

/**
 * Select-menu values and their reader-friendly labels.
 * The stored value stays compact and stable while the visible label can use
 * normal capitalization and spacing.
 */
export const subjectOptions: { value: Subject; label: string }[] = [
  { value: 'algebra', label: 'Algebra' },
  { value: 'combinatorics', label: 'Combinatorics' },
  { value: 'geometry', label: 'Geometry' },
  { value: 'number-theory', label: 'Number theory' },
]

/**
 * Outcome choices used by the form, history, and detail page.
 *
 * `label` is the complete sentence-like description used where there is room.
 * `shortLabel` is the compact version used in rows and small controls.
 */
export const resultOptions: { value: AttemptResult; label: string; shortLabel: string }[] = [
  { value: 'independent', label: 'Solved independently', shortLabel: 'Independent' },
  { value: 'tiny-hint', label: 'Solved with a tiny hint', shortLabel: 'Tiny hint' },
  { value: 'large-hint', label: 'Solved with a large hint', shortLabel: 'Large hint' },
  { value: 'partial-solution', label: 'Read part of the solution', shortLabel: 'Partial solution' },
  { value: 'full-solution', label: 'Read the full solution', shortLabel: 'Full solution' },
]

/**
 * Common breakdown patterns available when the result was not independent.
 * This field is optional because an independent solution does not need a failure
 * diagnosis, and a learner may prefer to leave it blank.
 */
export const mistakeTypeOptions = [
  { value: 'unsure-how-to-begin', label: 'Unsure how to begin' },
  { value: 'couldnt-finish', label: "Found the method but couldn't finish" },
  { value: 'logic-counting-error', label: 'Logic or counting error' },
  { value: 'algebra-arithmetic-error', label: 'Algebra or arithmetic error' },
  { value: 'edge-case-omitted', label: 'Omitted an edge case' },
  { value: 'misread-condition', label: 'Misread a condition' },
  { value: 'time-pressure', label: 'Rushed under time pressure' },
  { value: 'gave-up-too-early', label: 'Gave up too early' },
  { value: 'bad-approach-too-long', label: 'Stayed with a bad approach too long' },
  { value: 'other', label: 'Other' },
]

/** The stored pressure values and the shorter labels shown in the segmented control. */
export const pressureLevelOptions: { value: PressureLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
