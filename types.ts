export interface Problem {
  id: string,
  year: string,
  contest: string,
  subcontest: string,
  problemNumber: string,
  url: string,
  rating: string,
  subject: string,
}

export interface Attempt {
  id: string,
  problemId: string,
  date: string,
  isReview: boolean,
  result: string,
  timeSpent: string,
  assistanceLevel: string,
  mistakeType: string,
  keyIdea: string,
  recognitionClue: string,
  pressureLevel: string,
}

export const subjectOptions = [
  { value: 'algebra', label: 'Algebra' },
  { value: 'combinatorics', label: 'Combinatorics' },
  { value: 'geometry', label: 'Geometry' },
  { value: 'number-theory', label: 'Number Theory' },
]

export const resultOptions = [
  { value: 'independent', label: 'Independently solved' },
  { value: 'tiny-hint', label: 'Used a tiny hint' },
  { value: 'large-hint', label: 'Used a large hint' },
  { value: 'partial-solution', label: 'Read partial solution' },
  { value: 'full-solution', label: 'Read full solution' },
]

export const mistakeTypeOptions = [
  { value: 'unsure-how-to-begin', label: 'Unsure how to begin' },
  { value: 'couldnt-finish', label: "Right method but couldn't finish" },
  { value: 'logic-counting-error', label: 'Counting error' },
  { value: 'algebra-arithmetic-error', label: 'Algebraic error' },
  { value: 'edge-case-omitted', label: 'Edge case omitted' },
  { value: 'misread-condition', label: 'Misread condition or problem' },
  { value: 'time-pressure', label: 'Time pressure forced a mistake' },
  { value: 'gave-up-too-early', label: 'Gave up too early' },
  { value: 'bad-approach-too-long', label: 'Stayed with a bad approach too long' },
  { value: 'other', label: 'Other' },
]

export const pressureLevelOptions = [
  { value: 'low', label: 'Low pressure' },
  { value: 'medium', label: 'Medium pressure' },
  { value: 'high', label: 'High pressure' },
]
