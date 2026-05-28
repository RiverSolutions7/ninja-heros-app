export interface WalkthroughParsed {
  title: string
  description: string
  /** Ordered setup/execution steps (new log-flow Cards 2 & 3). Optional for backward compat. */
  sequenceSteps?: string[]
  /** Coach tips / cues (new log-flow Card 3). Optional for backward compat. */
  coachTips?: string[]
  skills: string[]
  durationMinutes: number | null
}

export interface WalkthroughStation {
  id: string
  photoFile: File
  photoUrl: string
  transcript: string
  parsed?: WalkthroughParsed
  parseError?: string
}
