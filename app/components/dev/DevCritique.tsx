// DEV/PREVIEW-ONLY mobile critique layer. Toggle "✎" (bottom-right, above the dock),
// tap any element on the running app, and a bottom sheet slides up to type a note. Save
// POSTs to /api/dev-note → public.dev_notes so the orchestrator reads feedback straight
// from the DB. If the POST fails the note falls back to localStorage['ninja-dev-notes']
// so nothing is ever lost. Note mode stays ON after a save for rapid tap-tap-tap review.
//
// Rendered ONLY behind the dev/preview gate (see DevCritiqueGate). When OFF it captures
// nothing — a single fixed overlay with pointer-events:none — so the real flow behaves
// 100% normally (record button, typing door, sheets all untouched).
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const FALLBACK_KEY = 'ninja-dev-notes'
const Z = 2147483000
const BUILD = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'local'
// Defense-in-depth: even though DevCritiqueGate is the intended single call site, this
// component self-checks the same dev/preview gate so a future stray import can never
// activate the capture-phase interception in production.
const ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'

interface Draft {
  element: string
  label: string
}

// Human label for the tapped element: prefer its text / aria-label, fall back to tag+class.
function labelFor(node: HTMLElement): string {
  const aria = node.getAttribute('aria-label')
  if (aria) return aria.trim().slice(0, 60)
  const txt = (node.textContent || '').replace(/\s+/g, ' ').trim()
  if (txt) return txt.slice(0, 60)
  const cls = (typeof node.className === 'string' ? node.className : '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join('.')
  return `<${node.tagName.toLowerCase()}${cls ? ` .${cls}` : ''}>`
}

// Compact selector-ish path so a note maps back to the exact component.
function selectorFor(node: HTMLElement): string {
  const parts: string[] = []
  let el: HTMLElement | null = node
  let hops = 0
  while (el && el !== document.body && hops < 4) {
    let part = el.tagName.toLowerCase()
    if (el.id) part += `#${el.id}`
    const cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\s+/)
      .filter((c) => c && !c.startsWith('active:') && !c.startsWith('hover:'))
      .slice(0, 2)
    if (cls.length) part += `.${cls.join('.')}`
    const aria = el.getAttribute('aria-label')
    if (aria) part += `[aria="${aria.slice(0, 30)}"]`
    parts.unshift(part)
    el = el.parentElement
    hops++
  }
  const r = node.getBoundingClientRect()
  return `${parts.join(' > ')}  @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`
}

// Resolve the meaningful element under a viewport point, skipping our own chrome.
function resolveTarget(x: number, y: number): HTMLElement | null {
  const stack = document.elementsFromPoint(x, y) as HTMLElement[]
  const hit = stack.find((e) => !e.closest('[data-dev-critique]'))
  if (!hit) return null
  // Climb to the nearest labelled control (aria / button / role), but don't climb into
  // big text containers — for a leaf/image tap we want the tapped node itself.
  let m: HTMLElement | null = hit
  let hops = 0
  while (m && m !== document.body && hops < 5) {
    if (m.getAttribute('aria-label') || m.tagName === 'BUTTON' || m.getAttribute('role')) break
    m = m.parentElement
    hops++
  }
  return m && m !== document.body ? m : hit
}

export default function DevCritique() {
  const [active, setActive] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [text, setText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1600)
  }, [])

  // Capture-phase interception: while note mode is ON (and no sheet open), a tap on the
  // app is swallowed and turned into a target selection. We intercept BOTH pointerdown
  // (opens the sheet) and click — on mouse/programmatic input, preventDefault on
  // pointerdown does NOT suppress the native click (that only holds for touch), and the
  // app's controls are onClick-based, so the click must be swallowed separately or it
  // fires the underlying action (record/submit/navigate) behind our overlay.
  useEffect(() => {
    if (!active || draft) return
    const isOurs = (e: Event) => {
      const t = e.target as HTMLElement | null
      return !!(t && t.closest('[data-dev-critique]'))
    }
    const onDown = (e: PointerEvent) => {
      if (isOurs(e)) return // let our own chrome work
      e.preventDefault()
      e.stopPropagation()
      const node = resolveTarget(e.clientX, e.clientY)
      if (!node) return
      setDraft({ element: selectorFor(node), label: labelFor(node) })
      setText('')
    }
    const swallowClick = (e: MouseEvent) => {
      if (isOurs(e)) return
      e.preventDefault()
      e.stopPropagation()
    }
    // capture:true so we win before the app's own handlers
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('click', swallowClick, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('click', swallowClick, true)
    }
  }, [active, draft])

  useEffect(() => {
    if (draft) {
      const id = window.setTimeout(() => textareaRef.current?.focus(), 30)
      return () => window.clearTimeout(id)
    }
  }, [draft])

  const cancel = () => {
    setDraft(null)
    setText('')
  }

  const save = async () => {
    if (!draft || !text.trim() || saving) return
    const body = {
      route: location.pathname + location.search,
      element: draft.element,
      label: draft.label,
      note: text.trim(),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      build: BUILD,
    }
    setSaving(true)
    let ok = false
    try {
      const res = await fetch('/api/dev-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      ok = res.ok
    } catch {
      ok = false
    }
    if (!ok) {
      try {
        const raw = localStorage.getItem(FALLBACK_KEY)
        const arr = raw ? JSON.parse(raw) : []
        arr.push({ ...body, ts: Date.now() })
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(arr))
      } catch {
        /* ignore */
      }
    }
    setSaving(false)
    setDraft(null)
    setText('')
    flash(ok ? 'Saved ✓' : 'Saved locally ✓')
    // note mode stays ON for the next tap
  }

  if (!ENABLED) return null

  const accent = '#ff5a1f'
  const ink = '#15171c'

  return (
    <div
      data-dev-critique
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z,
        pointerEvents: 'none',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* subtle wash + crosshair hint while armed */}
      {active && !draft && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,90,31,0.05)', pointerEvents: 'none' }} />
      )}

      {/* toast */}
      {toast && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 14px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: accent,
            color: '#1a0f06',
            fontSize: 13,
            fontWeight: 800,
            padding: '8px 16px',
            borderRadius: 999,
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        >
          {toast}
        </div>
      )}

      {/* bottom sheet */}
      {draft && (
        <>
          <div
            onClick={cancel}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', pointerEvents: 'auto' }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'auto',
              background: ink,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              borderTop: `2px solid ${accent}`,
              padding: '14px 16px calc(env(safe-area-inset-bottom) + 14px)',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  flex: 'none',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#1a0f06',
                  background: accent,
                  borderRadius: 6,
                  padding: '2px 7px',
                }}
              >
                ✎
              </span>
              <span style={{ flex: 1, fontSize: 12.5, color: '#dfe2e8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {draft.label}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
                if (e.key === 'Escape') cancel()
              }}
              placeholder="What should change here?"
              style={{
                width: '100%',
                height: 88,
                resize: 'none',
                border: '1px solid #2a2d35',
                borderRadius: 10,
                background: '#0c0e12',
                color: '#fff',
                fontSize: 16,
                lineHeight: 1.4,
                padding: 10,
                outline: 'none',
                boxSizing: 'border-box',
                WebkitAppearance: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={cancel}
                disabled={saving}
                style={{
                  flex: '0 0 auto',
                  minHeight: 44,
                  fontSize: 15,
                  padding: '11px 18px',
                  borderRadius: 10,
                  border: '1px solid #2a2d35',
                  background: 'transparent',
                  color: '#9aa0aa',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!text.trim() || saving}
                style={{
                  flex: 1,
                  minHeight: 44,
                  fontSize: 15,
                  fontWeight: 800,
                  padding: '11px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: text.trim() && !saving ? accent : '#3a2d24',
                  color: text.trim() && !saving ? '#1a0f06' : '#7c6a5c',
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* toggle FAB — bottom-right, sits above the dock disc (dock is centered).
          Hidden while a sheet is open so it can't overlap/steal the Save tap. */}
      {!draft && (
      <button
        onClick={() => {
          setActive((a) => !a)
          setDraft(null)
        }}
        aria-label={active ? 'Critique mode on' : 'Critique mode off'}
        style={{
          position: 'absolute',
          right: 'calc(env(safe-area-inset-right) + 12px)',
          bottom: 'calc(env(safe-area-inset-bottom) + 16px)',
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 800,
          background: active ? accent : 'rgba(21,23,28,0.72)',
          color: active ? '#1a0f06' : '#ff5a1f',
          backdropFilter: active ? undefined : 'blur(6px)',
          WebkitBackdropFilter: active ? undefined : 'blur(6px)',
          boxShadow: active ? `0 0 0 3px rgba(255,90,31,0.35), 0 6px 18px rgba(0,0,0,0.5)` : '0 6px 18px rgba(0,0,0,0.5)',
        }}
      >
        ✎
      </button>
      )}
    </div>
  )
}
