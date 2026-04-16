'use client'

import { useEffect } from 'react'

/**
 * Dev-only component. Forwards runtime errors, unhandled promise
 * rejections, and console.error calls to /api/dev-log so they print
 * in the dev server terminal. Lets the assistant see errors the
 * coach hits on their phone without a screenshot round-trip.
 *
 * Gated on NODE_ENV !== 'production' in the parent mount so it
 * compiles out of prod builds entirely.
 */
export default function DevErrorForwarder() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const seen = new Set<string>()
    let inFlight = 0

    const send = (payload: Record<string, unknown>) => {
      // Avoid infinite loops: if the forwarder itself errors, don't
      // forward that. Cap in-flight requests too.
      if (inFlight > 4) return
      const key = `${payload.kind}|${payload.message}|${payload.source}`
      if (seen.has(key)) return
      seen.add(key)
      // Forget keys after a bit so repeated errors during a session are
      // still visible if the coach retries the broken action later.
      setTimeout(() => seen.delete(key), 5000)

      inFlight += 1
      try {
        fetch('/api/dev-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            href: window.location.href,
            userAgent: navigator.userAgent,
          }),
          keepalive: true,
        })
          .catch(() => {})
          .finally(() => {
            inFlight -= 1
          })
      } catch {
        inFlight -= 1
      }
    }

    const onError = (event: ErrorEvent) => {
      send({
        kind: 'error',
        message: event.message,
        source:
          event.filename && event.lineno
            ? `${event.filename}:${event.lineno}:${event.colno ?? 0}`
            : event.filename ?? '',
        stack: event.error?.stack ?? '',
      })
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      let message = ''
      let stack = ''
      if (reason instanceof Error) {
        message = reason.message
        stack = reason.stack ?? ''
      } else if (typeof reason === 'string') {
        message = reason
      } else {
        try {
          message = JSON.stringify(reason)
        } catch {
          message = String(reason)
        }
      }
      send({ kind: 'unhandledrejection', message, stack, source: '' })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    // Wrap console.error so caught-and-logged errors flow through too.
    const origError = console.error
    console.error = (...args: unknown[]) => {
      try {
        const first = args[0]
        let message = ''
        let stack = ''
        if (first instanceof Error) {
          message = first.message
          stack = first.stack ?? ''
        } else {
          message = args
            .map((a) => {
              if (a instanceof Error) return a.message
              if (typeof a === 'string') return a
              try {
                return JSON.stringify(a)
              } catch {
                return String(a)
              }
            })
            .join(' ')
        }
        send({ kind: 'console.error', message, stack, source: '' })
      } catch {
        // swallow — never break the real console.error
      }
      origError.apply(console, args)
    }

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      console.error = origError
    }
  }, [])

  return null
}
