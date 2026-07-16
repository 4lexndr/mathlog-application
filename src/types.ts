// A problem holds stable source metadata shared by its attempts.
export interface Problem {
  id: string,
  year: string,
  contest: string,
  subcontest: string,
  problemNumber: string,
  url: string,
  rating: number,
  subject: string,
  screenshot?: string,
  reviewDate: string,
}

// An attempt records one practice session.
export interface Attempt {
  id: string,
  problemId: string,
  date: string,
  isReview: boolean,
  result: string,
  timeSpent: number,
  mistakeType: string,
  keyIdea: string,
  recognitionClue: string,
  contestStatus: string,
}

// Shared option lists keep stored values and visible labels consistent.
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
  { value: 'concept-gap', label: 'Concept gap', description: 'Did not know the necessary idea' },
  { value: 'recognition-gap', label: 'Recognition gap', description: 'Knew the tool, but did not recognize that it applied' },
  { value: 'modeling-gap', label: 'Modeling gap', description: 'Represented the problem incorrectly' },
  { value: 'execution-error', label: 'Execution error', description: 'Correct strategy, incorrect implementation' },
  { value: 'overcounting-undercounting', label: 'Overcounting/undercounting', description: '' },
  { value: 'edge-case-omission', label: 'Edge-case omission', description: '' },
  { value: 'misread', label: 'Misread', description: '' },
  { value: 'premature-abandonment', label: 'Premature abandonment', description: 'Abandoned a productive approach' },
  { value: 'unproductive-fixation', label: 'Unproductive fixation', description: 'Stayed too long with a bad approach' },
  { value: 'pressure-rushing', label: 'Pressure/rushing', description: '' },
  { value: 'careless-arithmetic-algebra', label: 'Careless arithmetic/algebra', description: '' },
  { value: 'other', label: 'Other', description: '' },
]

export const contestStatusOptions = [
  { value: 'rated', label: 'Rated' },
  { value: 'unrated', label: 'Unrated' },
]
