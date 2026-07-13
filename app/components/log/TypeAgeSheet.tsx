// @design-locked — built from design-export/capture/frames/8g-type-age-sheet.html (the picker) +
// 8h-add-type-form.html (the inline add-type mini-form). Every color/size/radius/opacity/padding here
// is copied from those frames. Two authored surfaces share ONE sheet container:
//   · 8g "main": TYPE pills (ALL text-only — defaults AND customs) + "+ New type" · AGE GROUPS
//     multi-select chips (selected = fill + bright inset ring + white text, NO ✓) + "+ Add" · "Done"
//     (text-only, Inter 600 white, top-right).
//   · 8h "addType": back ‹ + "New type" · a plain name field · full-width "Add type". No plannable
//     toggle (plannable defaults TRUE).
// CHUNK 11 (River, 2026-07-11, ⑤): the monogram letter-tile is DEAD — removed from the custom-type
// pill AND the add-form field preview; the `monogram` DB column is no longer written (it stays for
// back-compat). Custom types now render exactly like defaults.
// CHUNK 15 ① (River, 2026-07-13): chunk-12's always-visible ✕ discs are VETOED. The ✕s now live behind
// an "Edit" TEXT toggle in the sheet's top-LEFT corner (mirrors "Done" top-right): tap Edit → ✕ discs
// appear on custom types + deletable curriculums + the label becomes "Done editing"; tap again to hide.
// Edit mode is sheet-session-local (reset on every open) and the "Edit" action is hidden entirely when
// nothing is deletable. Pill/chip TAPS still select normally in edit mode — only the ✕ deletes.
// UNAUTHORED, screen-local (flagged in the chunk report): (a) custom-type pills — no frame shows one;
// rendered as a plain text pill, identical to a default. (b) the "add age group" mini-form — no frame;
// modeled on 8h. (c) the D2 spring-settle arrival motion — named in the ledger, no rig in
// motion-dc.js; values flagged below.
//
// FROSTED/FREEZE: the frame authors the sheet SOLID (background rgb(20,28,50), no backdrop-filter), so
// there is nothing to freeze — the D2 settle animates transform/opacity ONLY, never a backdrop-filter.
// polish-audit: flag a11y / tap-targets / state / motion-perf / bugs — not the design values.
'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import {
  FALLBACK_AGES,
  FALLBACK_TYPES,
  displayType,
  type AgeOption,
  type TypeOption,
} from '@/app/lib/typeAge'

const INTER = 'var(--font-inter), sans-serif'

// ── D2 spring-settle (UNAUTHORED — flagged for River's gate-B eyeball) ────────────────────────────
// The ledger names the arrival "slide-up + soft spring landing"; motion-dc.js has no rig for it. Chosen
// values: the panel slides translateY(100% → 0) on a sampled damped spring (ζ=0.72, ωn=9 → ~3.8%
// overshoot, a soft landing), 460ms, 30 keyframes; the scrim fades opacity 0→1 over 240ms ease-out.
// Exit = slide-down 260ms ease-in + scrim fade 220ms. Reduced motion = opacity crossfade only (no
// transform). transform/opacity ONLY — no backdrop-filter is touched (the surface is solid).
const D2 = { inMs: 460, samples: 30, zeta: 0.72, wn: 9, scrimInMs: 240, outMs: 260, scrimOutMs: 220 }
function springSettle(t: number): number {
  if (t >= 1) return 1
  const { zeta, wn } = D2
  const wd = wn * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + ((zeta * wn) / wd) * Math.sin(wd * t))
}
function slideKeyframes(): Keyframe[] {
  const kf: Keyframe[] = []
  for (let i = 0; i <= D2.samples; i++) {
    const p = springSettle(i / D2.samples)
    kf.push({ transform: `translateY(${(1 - p) * 100}%)` })
  }
  return kf
}
function prefersReduced() {
  return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

export interface TypeAgeSheetProps {
  open: boolean
  /** Current committed type name (component_types.name, lowercase). */
  type: string
  /** Current committed age groups (curriculums.age_group). */
  ages: string[]
  /** Any close path (Done · scrim tap · Esc · swipe-down) commits the working selection. */
  onDone: (type: string, ages: string[]) => void
}

function BackChevron() {
  return (
    <svg width="11" height="19" viewBox="0 0 10 17" fill="none" aria-hidden="true">
      <path d="M8.2 1.6 1.8 8.5l6.4 6.9" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// PhotoSheet's tile-✕ glyph, verbatim (chunk 12 ②: the delete disc reuses that exact language).
function CloseGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M1.5 1.5l6 6M7.5 1.5l-6 6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── chunk 12 ② — the corner ✕ delete disc (PhotoSheet's tile-✕ language: 22px disc, rgba(4,7,16,0.55),
// 44px hit area centered on the disc). Sits on the pill/chip's top-right corner; zIndex keeps its
// hit-slop above the neighboring pills in the wrap grid.
function DeleteDisc({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onTap() }}
      style={{
        position: 'absolute',
        // 44px target BIASED DOWN-LEFT (polish-audit chunk 12 #3): a centered box overreached ~16px
        // past the pill's top/right edge — more than the wrap grid's 10px gap — so on a wrapped row it
        // stole taps from the pill above. The box now tops out 8px above the pill (inside the gap);
        // the disc's VISIBLE spot is unchanged (its top-right corner still sits at −5,−5 via padding).
        top: -8,
        right: -8,
        width: 44,
        height: 44,
        border: 'none',
        background: 'transparent',
        padding: '3px 3px 0 0',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        zIndex: 2,
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(4,7,16,0.55)', boxShadow: 'rgba(255,255,255,0.16) 0px 0px 0px 1px inset', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CloseGlyph />
      </span>
    </button>
  )
}

// Screen-local delete confirm (chunk 12 ②) — the flow's pinned tokens (Inter, screen-local surfaces),
// mirroring Capture's DiscardConfirm a11y contract: focus lands on the SAFE action, Tab is trapped
// between the two buttons, Escape cancels. The shared ConfirmSheet primitive stays rejected here for
// the same reason as Capture's (old-app tokens: Russo One, accent-fire, Tailwind radii).
function DeleteConfirm({ name, onDelete, onCancel }: { name: string; onDelete: () => void; onCancel: () => void }) {
  const deleteRef = useRef<HTMLButtonElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
      } else if (e.key === 'Tab') {
        const first = deleteRef.current
        const last = cancelRef.current
        if (!first || !last) return
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        else if (document.activeElement !== first && document.activeElement !== last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Delete ${name}?`}
      onClick={onCancel}
      style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(4,7,16,0.62)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 390, margin: '0 12px 24px', background: 'rgb(20,28,50)', border: '1px solid rgb(42,52,80)', borderRadius: 20, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <span style={{ fontFamily: INTER, fontWeight: 700, fontSize: 17, color: 'rgb(255,255,255)', textAlign: 'center' }}>{`Delete ‘${name}’?`}</span>
        <span style={{ fontFamily: INTER, fontWeight: 400, fontSize: 13.5, lineHeight: 1.5, color: 'rgb(159,176,200)', textAlign: 'center' }}>
          Cards already using it keep their label.
        </span>
        <button
          ref={deleteRef}
          type="button"
          onClick={onDelete}
          className="transition-transform active:scale-[0.98]"
          style={{ minHeight: 48, border: 'none', borderRadius: 14, background: 'rgb(255,90,31)', cursor: 'pointer', fontFamily: INTER, fontWeight: 700, fontSize: 15, color: 'rgb(255,255,255)' }}
        >
          Delete
        </button>
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="transition-transform active:scale-[0.98]"
          style={{ minHeight: 44, border: '1px solid rgb(42,52,80)', borderRadius: 14, background: 'transparent', cursor: 'pointer', fontFamily: INTER, fontWeight: 600, fontSize: 14, color: 'rgb(231,238,250)' }}
        >
          Keep it
        </button>
      </div>
    </div>
  )
}

// What the ✕ is asking to delete (typed so the confirm + handler stay in one place).
type PendingDelete = { kind: 'type'; name: string } | { kind: 'age'; ageGroup: string; label: string }

export default function TypeAgeSheet({ open, type, ages, onDone }: TypeAgeSheetProps) {
  // Mount lifecycle: mount on open, keep mounted through the exit slide, then unmount.
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'main' | 'addType' | 'addAge'>('main')

  // Option lists (seeded fallback first so the sheet always renders instantly, even offline).
  const [types, setTypes] = useState<TypeOption[]>(FALLBACK_TYPES)
  const [ageOpts, setAgeOpts] = useState<AgeOption[]>(FALLBACK_AGES)

  // Working selection — a copy of the committed props, edited while open; committed on any close.
  const [workType, setWorkType] = useState(type)
  const [workAges, setWorkAges] = useState<string[]>(ages)

  // Add-form inputs.
  const [newTypeName, setNewTypeName] = useState('')
  const [newAgeName, setNewAgeName] = useState('')
  const [busy, setBusy] = useState(false)

  // CHUNK 12 ② (River ✎ note, 2026-07-12: "no way to undo" an added type): the ✕ flow's pending
  // confirm. null = no confirm up.
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  // CHUNK 15 ① (River, 2026-07-13: chunk-12's always-on ✕s VETOED): edit mode is off by default; the
  // top-left "Edit" text action flips it on to reveal the ✕ delete discs. Sheet-session-local — reset
  // to false on every (re)open below (closing the sheet forgets it).
  const [editMode, setEditMode] = useState(false)

  const scrimRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const typeInputRef = useRef<HTMLInputElement | null>(null)
  const ageInputRef = useRef<HTMLInputElement | null>(null)
  const swipeStart = useRef<number | null>(null)
  const dragDy = useRef(0)
  const restoreFocus = useRef<HTMLElement | null>(null)

  // Fetch live options once (mount). Fallback stays if the read fails or returns empty — the flow
  // must never block on the DB. component_types: text-only defaults, monogram tiles for customs.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [t, a] = await Promise.all([
          supabase.from('component_types').select('name, monogram, is_default, sort_order').order('sort_order').order('name'),
          supabase.from('curriculums').select('age_group, label, sort_order').order('sort_order').order('label'),
        ])
        if (!alive) return
        if (!t.error && Array.isArray(t.data) && t.data.length) setTypes(t.data as TypeOption[])
        if (!a.error && Array.isArray(a.data) && a.data.length) setAgeOpts(a.data as AgeOption[])
      } catch {
        /* keep the seeded fallback — the flow proceeds */
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  // On (re)open: reset the working copy + mode from the committed props, remember the trigger to
  // restore focus to on close.
  useEffect(() => {
    if (!open) return
    setWorkType(type)
    setWorkAges(ages)
    setMode('main')
    setNewTypeName('')
    setNewAgeName('')
    setPendingDelete(null)
    setEditMode(false) // CHUNK 15 ① — edit mode is sheet-session-local: every open starts un-edited
    restoreFocus.current = (document.activeElement as HTMLElement) ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Commit the working selection and let the parent close the sheet.
  const commit = useCallback(() => {
    onDone(workType, workAges)
  }, [onDone, workType, workAges])

  // ── entrance / exit motion (WAAPI, transform + opacity only) ──────────────────────────────────
  useLayoutEffect(() => {
    if (!mounted) return
    const panel = panelRef.current
    const scrim = scrimRef.current
    const reduced = prefersReduced()
    // Cancel any in-flight open/exit animation so a fast close→reopen (or reopen mid-exit) doesn't
    // compound — the stale exit's finish must NOT fire against a freshly reopened sheet.
    panel?.getAnimations().forEach((a) => a.cancel())
    scrim?.getAnimations().forEach((a) => a.cancel())

    if (open) {
      if (scrim) scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 200 : D2.scrimInMs, easing: 'ease-out', fill: 'both' })
      if (panel) {
        panel.style.transform = 'translateY(0%)'
        if (reduced) panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out', fill: 'both' })
        else panel.animate(slideKeyframes(), { duration: D2.inMs, easing: 'linear', fill: 'both' })
      }
      dragDy.current = 0
      // Move focus into the dialog for VoiceOver / keyboard.
      dialogRef.current?.focus()
      return
    }

    // exit — a natural finish unmounts + restores focus; a reopen mid-flight runs the cleanup below,
    // which flags `cancelled` so the stale finish is a no-op (blocks the un-render race).
    let cancelled = false
    const finish = () => {
      if (cancelled) return
      restoreFocus.current?.focus?.()
      setMounted(false)
    }
    if (scrim) scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 160 : D2.scrimOutMs, easing: 'ease-in', fill: 'both' })
    if (panel) {
      // Start the slide-down from the current dragged offset (if the exit came from a swipe) so the
      // motion is continuous rather than snapping back to 0 first.
      const startTransform = dragDy.current > 0 ? `translateY(${dragDy.current}px)` : 'translateY(0%)'
      const a = reduced
        ? panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'both' })
        : panel.animate([{ transform: startTransform }, { transform: 'translateY(100%)' }], { duration: D2.outMs, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'both' })
      a.onfinish = finish
      // NOTE: oncancel deliberately does NOT finish — a cancel means "reopen", not "closed".
    } else {
      finish()
    }
    dragDy.current = 0
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted])

  // Focus management: autofocus the add-forms' text field; returning to 'main' (Back / Esc / submit)
  // pulls focus back into the dialog so it never drops to <body> and leaks past the Tab trap.
  useEffect(() => {
    if (!mounted) return
    if (mode === 'addType') typeInputRef.current?.focus()
    else if (mode === 'addAge') ageInputRef.current?.focus()
    else dialogRef.current?.focus()
  }, [mode, mounted])

  // Keyboard: Esc closes (commits) from main; from an add-form Esc returns to main. Tab is trapped.
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (!open) return // during the exit animation the sheet is still mounted — don't act on keys
      if (pendingDelete) return // the delete confirm owns Escape/Tab while it's up (its own trap)
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (mode === 'main') commit()
        else setMode('main')
        return
      }
      if (e.key === 'Tab') {
        const root = dialogRef.current
        if (!root) return
        const f = Array.from(
          root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
        if (f.length === 0) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [mounted, open, mode, commit, pendingDelete])

  // ── swipe-down dismiss on the grab handle ─────────────────────────────────────────────────────
  const onHandleDown = (e: React.PointerEvent) => {
    swipeStart.current = e.clientY
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  const onHandleMove = (e: React.PointerEvent) => {
    if (swipeStart.current === null) return
    const dy = e.clientY - swipeStart.current
    const panel = panelRef.current
    if (!panel) return
    if (dy > 0) {
      panel.getAnimations().forEach((a) => a.cancel()) // let the inline transform win while dragging
      panel.style.transform = `translateY(${dy}px)`
      dragDy.current = dy
    }
  }
  const onHandleUp = (e: React.PointerEvent) => {
    if (swipeStart.current === null) return
    const dy = e.clientY - swipeStart.current
    swipeStart.current = null
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    const panel = panelRef.current
    // past threshold → dismiss; dragDy is preserved so the exit slide continues from here (no snap).
    if (dy > 80) { commit(); return }
    // snap back to rest
    dragDy.current = 0
    if (panel) {
      const from = Math.max(0, dy)
      panel.style.transform = 'translateY(0%)'
      panel.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0%)' }], { duration: 200, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'both' })
    }
  }

  // ── add flows ─────────────────────────────────────────────────────────────────────────────────
  const submitType = async () => {
    const name = newTypeName.trim().toLowerCase()
    if (!name || busy) return
    // Already exists → just select it and return.
    const existing = types.find((t) => t.name === name)
    if (existing) { setWorkType(existing.name); setMode('main'); return }
    // River (2026-07-11, chunk 11 ⑤): monograms are dead — no letter-tile renders anywhere, so the
    // `monogram` column is no longer written (lighter touch; the column itself stays for back-compat).
    const row: TypeOption = { name, monogram: null, is_default: false, sort_order: (types.at(-1)?.sort_order ?? 0) + 1 }
    setBusy(true)
    try {
      const { error } = await supabase
        .from('component_types')
        .insert({ name, plannable: true, is_default: false, sort_order: row.sort_order })
      if (error) throw error
    } catch {
      // DB unreachable → keep the type in-memory so the flow proceeds (won't persist; flagged).
    } finally {
      setBusy(false)
    }
    if (!panelRef.current) return // sheet closed while the insert was in flight — don't clobber state
    setTypes((prev) => [...prev, row])
    setWorkType(name)
    setMode('main')
  }

  const submitAge = async () => {
    const label = newAgeName.trim()
    if (!label || busy) return
    const existing = ageOpts.find((a) => a.age_group === label || a.label === label)
    if (existing) { setWorkAges((prev) => (prev.includes(existing.age_group) ? prev : [...prev, existing.age_group])); setMode('main'); return }
    // Match the app's existing add-curriculum precedent (settings/page.tsx): age_group = label.
    const row: AgeOption = { age_group: label, label, sort_order: (ageOpts.at(-1)?.sort_order ?? 0) + 1 }
    setBusy(true)
    try {
      const { error } = await supabase.from('curriculums').insert({ label, age_group: label, sort_order: row.sort_order })
      if (error) throw error
    } catch {
      /* keep in-memory (flagged) */
    } finally {
      setBusy(false)
    }
    if (!panelRef.current) return // sheet closed while the insert was in flight — don't clobber state
    setAgeOpts((prev) => [...prev, row])
    setWorkAges((prev) => [...prev, label])
    setMode('main')
  }

  const toggleAge = (ag: string) => {
    setWorkAges((prev) => (prev.includes(ag) ? prev.filter((x) => x !== ag) : [...prev, ag]))
  }

  // ── chunk 12 ② — confirmed delete ───────────────────────────────────────────────────────────────
  // Local removal is immediate (mirrors the add flow's offline tolerance: the list is responsive even
  // if the DB is unreachable — an unpersisted delete resurrects next launch, same tradeoff as an
  // unpersisted add). Selection falls back sensibly: type → 'station'; ages → dropped from selection.
  const performDelete = useCallback(async (pd: PendingDelete) => {
    setPendingDelete(null)
    dialogRef.current?.focus() // the confirm had focus; hand it back to the sheet
    if (pd.kind === 'type') {
      setTypes((prev) => prev.filter((t) => t.name !== pd.name))
      setWorkType((cur) => (cur === pd.name ? 'station' : cur))
      try {
        // Belt: is_default=false in the WHERE clause so a default row can never be deleted even if a
        // stale ✕ somehow targets one (the UI never renders ✕ on defaults).
        const { error } = await supabase.from('component_types').delete().eq('name', pd.name).eq('is_default', false)
        if (error) throw error
      } catch { /* DB unreachable — the removal stays local this session (flagged in the report) */ }
    } else {
      setAgeOpts((prev) => prev.filter((a) => a.age_group !== pd.ageGroup))
      setWorkAges((prev) => prev.filter((x) => x !== pd.ageGroup))
      try {
        const { error } = await supabase.from('curriculums').delete().eq('age_group', pd.ageGroup)
        if (error) throw error
      } catch { /* same tolerance */ }
    }
  }, [])

  const cancelDelete = useCallback(() => {
    setPendingDelete(null)
    dialogRef.current?.focus()
  }, [])

  if (!mounted) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {/* scrim (tpl414) — plain rgba, tap to dismiss (commits) */}
      <div
        ref={scrimRef}
        onClick={commit}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'rgba(4,7,16,0.62)' }}
      />

      {/* sheet panel (tpl415) — SOLID (no backdrop-filter). Only transform/opacity animate. */}
      <div
        ref={(el) => { panelRef.current = el; dialogRef.current = el }}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'addType' ? 'New type' : mode === 'addAge' ? 'New curriculum' : 'Type and curriculum'}
        tabIndex={-1}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 464,
          borderRadius: '20px 20px 0px 0px',
          background: 'rgb(20,28,50)',
          boxShadow: 'rgba(0,0,0,0.5) 0px -18px 44px',
          display: 'flex',
          flexDirection: 'column',
          padding: '10px 24px 40px',
          outline: 'none',
          transform: 'translateY(100%)',
        }}
      >
        {mode === 'main' ? (
          <MainContent
            types={types}
            ageOpts={ageOpts}
            workType={workType}
            workAges={workAges}
            editMode={editMode}
            onToggleEdit={() => setEditMode((v) => !v)}
            onPickType={setWorkType}
            onToggleAge={toggleAge}
            onNewType={() => setMode('addType')}
            onNewAge={() => setMode('addAge')}
            onDeleteType={(name) => setPendingDelete({ kind: 'type', name })}
            onDeleteAge={(ageGroup, label) => setPendingDelete({ kind: 'age', ageGroup, label })}
            onDone={commit}
            onHandleDown={onHandleDown}
            onHandleMove={onHandleMove}
            onHandleUp={onHandleUp}
          />
        ) : mode === 'addType' ? (
          <AddForm
            heading="New type"
            value={newTypeName}
            placeholder="Kata"
            inputRef={typeInputRef}
            busy={busy}
            submitLabel="Add type"
            onChange={setNewTypeName}
            onBack={() => setMode('main')}
            onSubmit={submitType}
            onHandleDown={onHandleDown}
            onHandleMove={onHandleMove}
            onHandleUp={onHandleUp}
          />
        ) : (
          <AddForm
            heading="New curriculum"
            value={newAgeName}
            placeholder="Competition Team"
            inputRef={ageInputRef}
            busy={busy}
            submitLabel="Add curriculum"
            onChange={setNewAgeName}
            onBack={() => setMode('main')}
            onSubmit={submitAge}
            onHandleDown={onHandleDown}
            onHandleMove={onHandleMove}
            onHandleUp={onHandleUp}
          />
        )}
      </div>

      {/* chunk 12 ② — the delete confirm covers the whole sheet (scrim + panel) while up */}
      {pendingDelete && (
        <DeleteConfirm
          name={pendingDelete.kind === 'type' ? displayType(pendingDelete.name) : pendingDelete.label}
          onDelete={() => void performDelete(pendingDelete)}
          onCancel={cancelDelete}
        />
      )}
    </div>
  )
}

// ── grab handle (tpl417 / tpl451) ────────────────────────────────────────────────────────────────
function GrabHandle({
  onDown,
  onMove,
  onUp,
}: {
  onDown: (e: React.PointerEvent) => void
  onMove: (e: React.PointerEvent) => void
  onUp: (e: React.PointerEvent) => void
}) {
  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        alignSelf: 'center',
        // ≥44px-tall hit area (swipe target). Negative top + trimmed bottom margin are hit-slop: they
        // keep the visible 5px bar's center and the content below exactly where the frame places them
        // (bar center pinned, content start unchanged) — the bar's size is untouched.
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 44,
        marginTop: -10,
        marginBottom: 4,
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <div style={{ width: 38, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.18)' }} />
    </div>
  )
}

// ── 8g main content ──────────────────────────────────────────────────────────────────────────────
function MainContent({
  types,
  ageOpts,
  workType,
  workAges,
  editMode,
  onToggleEdit,
  onPickType,
  onToggleAge,
  onNewType,
  onNewAge,
  onDeleteType,
  onDeleteAge,
  onDone,
  onHandleDown,
  onHandleMove,
  onHandleUp,
}: {
  types: TypeOption[]
  ageOpts: AgeOption[]
  workType: string
  workAges: string[]
  editMode: boolean
  onToggleEdit: () => void
  onPickType: (name: string) => void
  onToggleAge: (ag: string) => void
  onNewType: () => void
  onNewAge: () => void
  onDeleteType: (name: string) => void
  onDeleteAge: (ageGroup: string, label: string) => void
  onDone: () => void
  onHandleDown: (e: React.PointerEvent) => void
  onHandleMove: (e: React.PointerEvent) => void
  onHandleUp: (e: React.PointerEvent) => void
}) {
  // CHUNK 15 ① — the "Edit" toggle only exists when something can actually be deleted: any CUSTOM type
  // (defaults are never deletable), OR any curriculum (curriculums carry no default marker — every chip
  // is deletable, chunk 12 ② note). All-defaults / no-curriculum ⇒ no ✕ would ever render, so no toggle.
  const hasDeletable = types.some((t) => !t.is_default) || ageOpts.length > 0
  return (
    <>
      {/* CHUNK 15 ① — "Edit" toggle: text-only, top-LEFT (mirrors Done), Inter 600 16px, muted vs Done's
          white; brightens to white + "Done editing" while active. Reveals/hides the ✕ delete discs.
          Hidden entirely when nothing is deletable. aria-pressed announces the toggle state. */}
      {hasDeletable && (
        <button
          type="button"
          onClick={onToggleEdit}
          aria-pressed={editMode}
          aria-label={editMode ? 'Done editing' : 'Edit types and curriculums'}
          style={{
            position: 'absolute',
            top: 16,
            left: 24,
            minHeight: 44,
            padding: '0 4px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: INTER,
            fontWeight: 600,
            fontSize: 16,
            color: editMode ? 'rgb(255,255,255)' : 'rgb(159,176,200)',
          }}
        >
          {editMode ? 'Done editing' : 'Edit'}
        </button>
      )}

      {/* Done (tpl416) — text-only, top-right, Inter 600 16px white */}
      <button
        type="button"
        onClick={onDone}
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          minHeight: 44,
          padding: '0 4px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: INTER,
          fontWeight: 600,
          fontSize: 16,
          color: 'rgb(255,255,255)',
        }}
      >
        Done
      </button>

      <GrabHandle onDown={onHandleDown} onMove={onHandleMove} onUp={onHandleUp} />

      {/* TYPE (tpl418) */}
      <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgb(125,138,163)', marginBottom: 12 }}>
        Type
      </div>
      <div role="radiogroup" aria-label="Type" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {types.map((t) => {
          const sel = t.name === workType
          // River (2026-07-11, chunk 11 ⑤): custom types render as TEXT-ONLY pills, exactly like
          // defaults — the monogram letter-tile is gone from the pill row.
          // CHUNK 12 ②: custom (is_default=false) pills carry the corner ✕ delete disc; defaults NEVER
          // show it. CHUNK 15 ①: the disc only renders in edit mode. The wrapper span only hosts the
          // absolutely-positioned disc — zero layout delta whether or not the disc is shown.
          return (
            <span key={t.name} style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => onPickType(t.name)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44,
                  padding: '10px 20px',
                  borderRadius: 22,
                  border: 'none',
                  cursor: 'pointer',
                  // selected: fill rgb(33,44,76) + inset ring rgb(58,70,102). unselected: no fill, no ring.
                  background: sel ? 'rgb(33,44,76)' : 'transparent',
                  boxShadow: sel ? 'rgb(58,70,102) 0px 0px 0px 1px inset' : 'none',
                  fontFamily: INTER,
                  fontWeight: 600,
                  fontSize: 15,
                  color: sel ? 'rgb(255,255,255)' : 'rgb(159,176,200)',
                }}
              >
                {displayType(t.name)}
              </button>
              {editMode && !t.is_default && <DeleteDisc label={`Delete the ${displayType(t.name)} type`} onTap={() => onDeleteType(t.name)} />}
            </span>
          )
        })}
      </div>
      {/* "+ New type" (tpl422) */}
      <button
        type="button"
        onClick={onNewType}
        style={{ alignSelf: 'flex-start', minHeight: 44, padding: '11px 4px', margin: '3px 0 0', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: INTER, fontWeight: 600, fontSize: 13, color: 'rgb(159,176,200)' }}
      >
        + New type
      </button>

      {/* CURRICULUM (tpl423) — River's gate-B override of the frame's "Age groups": the section
          holds age bands AND whole curriculums. Data model unchanged (still the curriculums table). */}
      <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgb(125,138,163)', marginTop: 28, marginBottom: 12 }}>
        Curriculum
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {ageOpts.map((a) => {
          const sel = workAges.includes(a.age_group)
          // CHUNK 12 ② NOTE: curriculums has NO default marker column (002 seeded Mini/Junior without
          // one), so EVERY chip is deletable — including the seeded pair. Flagged in the chunk report;
          // a future is_default column slots straight into this condition.
          return (
            <span key={a.age_group} style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                type="button"
                role="checkbox"
                aria-checked={sel}
                aria-label={a.label}
                onClick={() => onToggleAge(a.age_group)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44,
                  padding: '8px 16px',
                  borderRadius: 19,
                  border: 'none',
                  cursor: 'pointer',
                  // selected: fill rgb(34,48,78) + bright inset ring rgb(58,77,119). unselected: dim ring only.
                  background: sel ? 'rgb(34,48,78)' : 'transparent',
                  boxShadow: sel ? 'rgb(58,77,119) 0px 0px 0px 1px inset' : 'rgb(42,52,80) 0px 0px 0px 1px inset',
                  fontFamily: INTER,
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: sel ? 'rgb(255,255,255)' : 'rgb(159,176,200)',
                }}
              >
                {a.label}
              </button>
              {editMode && <DeleteDisc label={`Delete the ${a.label} curriculum`} onTap={() => onDeleteAge(a.age_group, a.label)} />}
            </span>
          )
        })}
        {/* "+ Add" (tpl429) */}
        <button
          type="button"
          onClick={onNewAge}
          aria-label="Add a curriculum"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: INTER, fontWeight: 600, fontSize: 13, color: 'rgb(159,176,200)' }}
        >
          + Add
        </button>
      </div>

      <div style={{ flex: '1 1 0%' }} />
    </>
  )
}

// ── 8h add-type mini-form (reused for add-age) ────────────────────────────────────────────────────
// River (2026-07-11, chunk 11 ⑤): the live monogram letter-tile preview is gone — the field is just
// the text input (monograms are dead everywhere).
function AddForm({
  heading,
  value,
  placeholder,
  inputRef,
  busy,
  submitLabel,
  onChange,
  onBack,
  onSubmit,
  onHandleDown,
  onHandleMove,
  onHandleUp,
}: {
  heading: string
  value: string
  placeholder: string
  inputRef: React.RefObject<HTMLInputElement>
  busy: boolean
  submitLabel: string
  onChange: (v: string) => void
  onBack: () => void
  onSubmit: () => void
  onHandleDown: (e: React.PointerEvent) => void
  onHandleMove: (e: React.PointerEvent) => void
  onHandleUp: (e: React.PointerEvent) => void
}) {
  const canSubmit = value.trim().length > 0 && !busy
  return (
    <>
      <GrabHandle onDown={onHandleDown} onMove={onHandleMove} onUp={onHandleUp} />

      {/* header row (tpl452) — back ‹ + heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{ minHeight: 44, minWidth: 44, margin: '-12px -12px -12px -14px', padding: '12px 12px 12px 14px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <BackChevron />
        </button>
        <span style={{ fontFamily: INTER, fontWeight: 700, fontSize: 16, letterSpacing: '-0.2px', color: 'rgb(255,255,255)' }}>{heading}</span>
      </div>

      {/* field (tpl456) — text input only (monogram tile removed, chunk 11 ⑤) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: 50,
          padding: '0px 16px',
          borderRadius: 14,
          background: 'rgb(14,20,38)',
          boxShadow: 'rgb(42,52,80) 0px 0px 0px 1px inset',
        }}
      >
        <input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          aria-label={`${heading} name`}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit() } }}
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            height: '100%',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: INTER,
            fontWeight: 500,
            fontSize: 16,
            color: 'rgb(231,238,250)',
            caretColor: 'rgb(231,238,250)',
          }}
        />
      </div>

      <div style={{ flex: '1 1 0%' }} />

      {/* Add button (tpl462) — full width */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        aria-busy={busy}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 52,
          borderRadius: 26,
          border: 'none',
          background: 'rgb(33,44,76)',
          boxShadow: 'rgb(58,70,102) 0px 0px 0px 1px inset',
          cursor: canSubmit ? 'pointer' : 'default',
          opacity: canSubmit ? 1 : 0.5,
          fontFamily: INTER,
          fontWeight: 700,
          fontSize: 14.5,
          color: 'rgb(255,255,255)',
        }}
      >
        {busy ? 'Adding…' : submitLabel}
      </button>
    </>
  )
}
