'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { randomId } from '@/app/lib/uuid'
import type { WalkthroughParsed, WalkthroughStation } from './types'

interface WalkthroughCtx {
  stations: WalkthroughStation[]
  addStation: (photoFile: File, transcript: string) => string
  setParsed: (id: string, parsed: WalkthroughParsed) => void
  setParseError: (id: string, message: string) => void
  removeStation: (id: string) => void
  clearAll: () => void
}

const Ctx = createContext<WalkthroughCtx | null>(null)

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [stations, setStations] = useState<WalkthroughStation[]>([])
  const objectUrls = useRef<Set<string>>(new Set())

  const addStation = useCallback((photoFile: File, transcript: string) => {
    const id = randomId()
    const photoUrl = URL.createObjectURL(photoFile)
    objectUrls.current.add(photoUrl)
    setStations((s) => [...s, { id, photoFile, photoUrl, transcript }])
    return id
  }, [])

  const setParsed = useCallback((id: string, parsed: WalkthroughParsed) => {
    setStations((s) => s.map((st) => (st.id === id ? { ...st, parsed, parseError: undefined } : st)))
  }, [])

  const setParseError = useCallback((id: string, message: string) => {
    setStations((s) => s.map((st) => (st.id === id ? { ...st, parseError: message } : st)))
  }, [])

  const removeStation = useCallback((id: string) => {
    setStations((s) => {
      const target = s.find((st) => st.id === id)
      if (target) {
        URL.revokeObjectURL(target.photoUrl)
        objectUrls.current.delete(target.photoUrl)
      }
      return s.filter((st) => st.id !== id)
    })
  }, [])

  const clearAll = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrls.current.clear()
    setStations([])
  }, [])

  const value = useMemo<WalkthroughCtx>(
    () => ({ stations, addStation, setParsed, setParseError, removeStation, clearAll }),
    [stations, addStation, setParsed, setParseError, removeStation, clearAll],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWalkthrough(): WalkthroughCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWalkthrough must be used inside WalkthroughProvider')
  return ctx
}
