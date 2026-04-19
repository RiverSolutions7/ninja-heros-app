'use client'

import { useRef, useState } from 'react'

// Minimal type definitions for the Web Speech API (not in standard TS lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  0: { transcript: string }
}
interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export type VoiceNoteState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

// Dev-mode grepable logs for voice-state transitions. Low volume —
// one line per state change / api call.
// Format: [gesture:voice] event=... key=value
function devLog(event: string, extras: Record<string, string | number | boolean> = {}) {
  if (process.env.NODE_ENV !== 'development') return
  const parts = Object.entries(extras).map(([k, v]) => `${k}=${v}`).join(' ')
  // eslint-disable-next-line no-console
  console.log(`[gesture:voice] event=${event}${parts ? ' ' + parts : ''}`)
}

export function useVoiceNote() {
  const [voiceState, setVoiceState] = useState<VoiceNoteState>('idle')
  const [transcript, setTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [isSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  })

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const transcriptRef = useRef('')

  function startRecording() {
    if (!isSupported) {
      devLog('start-skip', { reason: 'unsupported' })
      return
    }
    devLog('start')
    setTranscript('')
    setErrorMessage(null)
    transcriptRef.current = ''

    const SpeechRecognitionImpl =
      window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognitionImpl) return
    const recognition = new SpeechRecognitionImpl()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = ''
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript
      }
      transcriptRef.current = full
      setTranscript(full)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      devLog('error', { error: event.error })
      const msg =
        event.error === 'not-allowed'
          ? 'Microphone permission denied'
          : event.error === 'network'
          ? 'Network error — check connection'
          : 'Could not process audio. Try typing instead.'
      setErrorMessage(msg)
      setVoiceState('error')
    }

    recognition.onend = () => {
      devLog('end')
      setVoiceState((prev) => {
        if (prev === 'recording') return 'processing'
        return prev
      })
    }

    recognitionRef.current = recognition
    recognition.start()
    setVoiceState('recording')
  }

  function stopRecording() {
    devLog('stop')
    recognitionRef.current?.stop()
    setVoiceState('processing')
  }

  async function parseNote(): Promise<string> {
    const text = transcriptRef.current.trim()
    if (!text) {
      devLog('parse-note-skip', { reason: 'empty' })
      setVoiceState('error')
      setErrorMessage('No speech detected. Try again.')
      return ''
    }
    devLog('parse-note', { chars: text.length })

    try {
      const res = await fetch('/api/parse-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })

      if (!res.ok) throw new Error(`api ${res.status}`)

      const data = (await res.json()) as { note: string }
      devLog('parse-note-done', { chars: data.note?.length ?? 0 })
      setVoiceState('done')
      return data.note
    } catch {
      devLog('parse-note-fail')
      setVoiceState('error')
      setErrorMessage('AI parse failed — raw transcript saved.')
      return `[Voice — please review]\n${text}`
    }
  }

  async function parseComponent(
    componentType: string,
    availableSkills?: string[]
  ): Promise<{ title: string; description: string; skills: string[]; durationMinutes: number | null }> {
    const text = transcriptRef.current.trim()
    if (!text) {
      devLog('parse-component-skip', { reason: 'empty' })
      setVoiceState('error')
      setErrorMessage('No speech detected. Try again.')
      return { title: '', description: '', skills: [], durationMinutes: null }
    }
    devLog('parse-component', { chars: text.length, type: componentType })

    try {
      const res = await fetch('/api/parse-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, componentType, availableSkills }),
      })

      if (!res.ok) throw new Error(`api ${res.status}`)

      const data = (await res.json()) as { title: string; description: string; skills: string[]; duration_minutes: number | null }
      devLog('parse-component-done', { skills: (data.skills ?? []).length, duration: data.duration_minutes ?? 0 })
      setVoiceState('done')
      return {
        title: data.title ?? '',
        description: data.description ?? '',
        skills: data.skills ?? [],
        durationMinutes: data.duration_minutes ?? null,
      }
    } catch {
      devLog('parse-component-fail')
      setVoiceState('error')
      setErrorMessage('AI parse failed — transcript saved to description.')
      return { title: '', description: `[Voice — please review]\n${text}`, skills: [], durationMinutes: null }
    }
  }

  function reset() {
    devLog('reset')
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setVoiceState('idle')
    setTranscript('')
    setErrorMessage(null)
    transcriptRef.current = ''
  }

  return {
    voiceState,
    transcript,
    errorMessage,
    isSupported,
    startRecording,
    stopRecording,
    parseNote,
    parseComponent,
    reset,
  }
}
