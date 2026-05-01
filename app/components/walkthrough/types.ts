export interface WalkthroughParsed {
  title: string
  description: string
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
