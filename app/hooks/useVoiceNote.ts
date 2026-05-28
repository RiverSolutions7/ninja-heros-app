'use client'

import { useRef, useState } from 'react'
import { parseComponentTranscript } from '@/app/lib/parseComponent'

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
    webkitAudioContext?: typeof AudioContext
  }
}

export type VoiceNoteState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

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

  // ─── Web Audio API — real waveform amplitude ──────────────────────────────
  // Runs in parallel with SpeechRecognition so we get both live text AND
  // accurate amplitude data for the waveform bars at 60fps.
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  async function startAudioAnalyser() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      audioStreamRef.current = stream
      const AudioCtxImpl = window.AudioContext ?? window.webkitAudioContext
      if (!AudioCtxImpl) return
      const ctx = new AudioCtxImpl()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount)
    } catch {
      devLog('audio-analyser-fail')
    }
  }

  function stopAudioAnalyser() {
    audioStreamRef.current?.getTracks().forEach((t) => t.stop())
    audioStreamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
    freqDataRef.current = null
  }

  // Called by waveform components on every animation frame.
  // Returns a 0–1 amplitude value; 0 when the analyser isn't running.
  function getAmplitude(): number {
    const analyser = analyserRef.current
    const data = freqDataRef.current
    if (!analyser || !data) return 0
    analyser.getByteFrequencyData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    return sum / (data.length * 255)
  }

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
      stopAudioAnalyser()
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
    // Fire-and-forget — analyser will be ready within milliseconds
    void startAudioAnalyser()
  }

  function stopRecording() {
    devLog('stop')
    recognitionRef.current?.stop()
    setVoiceState('processing')
    stopAudioAnalyser()
  }

  async function parseNote(existing?: string): Promise<string> {
    const text = transcriptRef.current.trim()
    if (!text) {
      devLog('parse-note-skip', { reason: 'empty' })
      setVoiceState('error')
      setErrorMessage('No speech detected. Try again.')
      return ''
    }
    devLog('parse-note', { chars: text.length, refine: !!(existing?.trim()) })

    try {
      const res = await fetch('/api/parse-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, ...(existing?.trim() ? { existing } : {}) }),
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
    availableSkills?: string[],
    existing?: { title?: string; description?: string; skills?: string[]; durationMinutes?: number | null },
    textOverride?: string
  ): Promise<{ title: string; description: string; sequenceSteps: string[]; coachTips: string[]; skills: string[]; durationMinutes: number | null }> {
    const text = (textOverride ?? transcriptRef.current).trim()
    if (!text) {
      devLog('parse-component-skip', { reason: 'empty' })
      setVoiceState('error')
      setErrorMessage('No speech detected. Try again.')
      return { title: '', description: '', sequenceSteps: [], coachTips: [], skills: [], durationMinutes: null }
    }
    devLog('parse-component', { chars: text.length, type: componentType, refine: !!existing, typed: !!textOverride })
    setVoiceState('processing')

    try {
      const result = await parseComponentTranscript(text, componentType, availableSkills, existing)
      devLog('parse-component-done', { skills: result.skills.length, duration: result.durationMinutes ?? 0 })
      setVoiceState('done')
      return {
        title: result.title,
        description: result.description,
        sequenceSteps: result.sequenceSteps ?? [],
        coachTips: result.coachTips ?? [],
        skills: result.skills,
        durationMinutes: result.durationMinutes,
      }
    } catch {
      devLog('parse-component-fail')
      setVoiceState('error')
      setErrorMessage('AI parse failed — transcript saved to description.')
      return { title: '', description: `[Voice — please review]\n${text}`, sequenceSteps: [], coachTips: [], skills: [], durationMinutes: null }
    }
  }

  function reset() {
    devLog('reset')
    recognitionRef.current?.stop()
    recognitionRef.current = null
    stopAudioAnalyser()
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
    getAmplitude,
  }
}
