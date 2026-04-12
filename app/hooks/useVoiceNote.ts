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
    if (!isSupported) return
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
    recognitionRef.current?.stop()
    setVoiceState('processing')
  }

  async function parseNote(): Promise<string> {
    const text = transcriptRef.current.trim()
    if (!text) {
      setVoiceState('error')
      setErrorMessage('No speech detected. Try again.')
      return ''
    }

    try {
      const res = await fetch('/api/parse-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })

      if (!res.ok) throw new Error(`api ${res.status}`)

      const data = (await res.json()) as { note: string }
      setVoiceState('done')
      return data.note
    } catch {
      setVoiceState('error')
      setErrorMessage('AI parse failed — raw transcript saved.')
      return `[Voice — please review]\n${text}`
    }
  }

  function reset() {
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
    reset,
  }
}
