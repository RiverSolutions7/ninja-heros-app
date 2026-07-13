// @design-locked — CHUNK 16 ① (N4, River 2026-07-13, 3 aspects grilled). The skills picker: a BOTTOM
// SHEET that is the TypeAgeSheet's sibling — SAME panel surface (rgb(20,28,50)), radius, D2 spring
// arrival, scrim, and "Done" (text-only, top-right). Opened by tapping a skill pill on the DevelopedCard
// glimpse OR the NotesDoc footer. Every color/size/radius/opacity here is copied verbatim from
// TypeAgeSheet (its values are themselves copied from frames 8g/8h) — this surface authors no new
// design language; it re-expresses the sibling's.
//
// CONTENT (grilled): ONE chip cloud — the `skills` table rows filtered to the selected curriculums
// (age_group IN curriculums; union across a multi-select; deduped by name), rendered in the sibling's
// multi-select CHIP language (selected = fill + bright inset ring; unselected = dim ring). The card's
// current skills are PRE-SELECTED (no provenance marks/sections — "simply pre-selected"). "+ New skill"
// is an inline mini-form (the type-sheet's add-form pattern: name → Add → inserted into the `skills`
// table {name, age_group: first selected curriculum} → selected). COMMIT-ON-CLOSE: Done AND every
// dismiss (scrim / Esc / swipe) push the working selection up via onDone. Empty result set (no skills
// for the curriculum) → the cloud shows just "+ New skill" (never a dead end).
//
// DIVERGENCE / SAFETY (flagged for River): the cloud is the DB skills UNION the card's current skills.
// The grill says "cloud = DB rows filtered to curriculum" AND "current skills pre-selected"; a current
// skill NOT present in the DB set (e.g. a skill the AI invented, or one whose curriculum isn't selected)
// can't be both — so it is INCLUDED (pre-selected) rather than silently dropped on commit. Dedupe by
// name keeps overlaps single.
//
// UNAUTHORED (no frame authored a skills sheet — the whole surface is the sibling's language reused):
// (a) the "SKILLS · <ages>" title caption (eyebrow language: the section-header caption token). (b) the
// D2 spring-settle arrival (copied from TypeAgeSheet, itself flagged there). FROSTED/FREEZE: the panel
// is SOLID (no backdrop-filter) — the D2 settle animates transform/opacity ONLY.
// polish-audit: flag a11y / tap-targets / state / motion-perf / bugs — not the design values.
'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { compressAges } from '@/app/lib/typeAge'

const INTER = 'var(--font-inter), sans-serif'

// ── D2 spring-settle (copied verbatim from TypeAgeSheet — the sibling arrival, UNAUTHORED there too) ──
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

export interface SkillsSheetProps {
  open: boolean
  /** Selected curriculum age_group values — filters which skills the cloud offers (union across them). */
  curriculums: string[]
  /** The card's current skills — pre-selected in the cloud (and preserved even if not in the DB set). */
  selected: string[]
  /** Any close path (Done · scrim tap · Esc · swipe-down) commits the working selection to the card. */
  onDone: (skills: string[]) => void
}

function BackChevron() {
  return (
    <svg width="11" height="19" viewBox="0 0 10 17" fill="none" aria-hidden="true">
      <path d="M8.2 1.6 1.8 8.5l6.4 6.9" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SkillsSheet({ open, curriculums, selected, onDone }: SkillsSheetProps) {
  // Mount lifecycle: mount on open, keep mounted through the exit slide, then unmount.
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'main' | 'add'>('main')

  // Cloud options (skill names) + the working selection — both seeded from `selected` on open so the
  // pre-selected chips render instantly, then merged with the DB read.
  const [skillNames, setSkillNames] = useState<string[]>(selected)
  const [workSkills, setWorkSkills] = useState<string[]>(selected)

  const [newSkillName, setNewSkillName] = useState('')
  const [busy, setBusy] = useState(false)

  const scrimRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const skillInputRef = useRef<HTMLInputElement | null>(null)
  const swipeStart = useRef<number | null>(null)
  const dragDy = useRef(0)
  const restoreFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) setMounted(true)
  }, [open])

  // On (re)open: reset the working copy + mode + add-form, seed the cloud from `selected`, remember the
  // trigger for focus restore.
  useEffect(() => {
    if (!open) return
    setWorkSkills(selected)
    setSkillNames(selected)
    setMode('main')
    setNewSkillName('')
    restoreFocus.current = (document.activeElement as HTMLElement) ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Fetch the curriculum-filtered skills whenever the sheet is open (curriculums can differ per open).
  // The cloud = DB names UNION the card's current skills (Set preserves DB order first). The fallback
  // (seeded `selected`) stays if the read fails/returns empty — the flow never blocks on the DB.
  useEffect(() => {
    if (!open) return
    let alive = true
    ;(async () => {
      if (curriculums.length === 0) {
        // No curriculum selected → no DB filter to run; the cloud is just the current skills (+ "+ New").
        if (alive) setSkillNames((prev) => Array.from(new Set([...selected, ...prev])))
        return
      }
      try {
        const { data, error } = await supabase
          .from('skills')
          .select('name')
          .in('age_group', curriculums)
          .order('name')
        if (!alive) return
        const dbNames = !error && Array.isArray(data) ? data.map((r) => r.name as string) : []
        // DB names first (sorted), then any current skill not in the DB set (never drop a card skill).
        setSkillNames(Array.from(new Set([...dbNames, ...selected])))
      } catch {
        /* keep the seeded fallback — the flow proceeds */
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, curriculums])

  // Commit the working selection and let the parent close the sheet.
  const commit = useCallback(() => {
    onDone(workSkills)
  }, [onDone, workSkills])

  // ── entrance / exit motion (WAAPI, transform + opacity only) — copied from TypeAgeSheet ────────────
  useLayoutEffect(() => {
    if (!mounted) return
    const panel = panelRef.current
    const scrim = scrimRef.current
    const reduced = prefersReduced()
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
      dialogRef.current?.focus()
      return
    }

    let cancelled = false
    const finish = () => {
      if (cancelled) return
      restoreFocus.current?.focus?.()
      setMounted(false)
    }
    if (scrim) scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 160 : D2.scrimOutMs, easing: 'ease-in', fill: 'both' })
    if (panel) {
      const startTransform = dragDy.current > 0 ? `translateY(${dragDy.current}px)` : 'translateY(0%)'
      const a = reduced
        ? panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'both' })
        : panel.animate([{ transform: startTransform }, { transform: 'translateY(100%)' }], { duration: D2.outMs, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'both' })
      a.onfinish = finish
    } else {
      finish()
    }
    dragDy.current = 0
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted])

  // Focus management: autofocus the add-form field; returning to 'main' pulls focus into the dialog.
  useEffect(() => {
    if (!mounted) return
    if (mode === 'add') skillInputRef.current?.focus()
    else dialogRef.current?.focus()
  }, [mode, mounted])

  // Keyboard: Esc closes (commits) from main; from the add-form Esc returns to main. Tab is trapped.
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
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
  }, [mounted, open, mode, commit])

  // ── swipe-down dismiss on the grab handle (copied from TypeAgeSheet) ───────────────────────────────
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
      panel.getAnimations().forEach((a) => a.cancel())
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
    if (dy > 80) { commit(); return }
    dragDy.current = 0
    if (panel) {
      const from = Math.max(0, dy)
      panel.style.transform = 'translateY(0%)'
      panel.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0%)' }], { duration: 200, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'both' })
    }
  }

  const toggleSkill = (name: string) => {
    setWorkSkills((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]))
  }

  // ── add flow ───────────────────────────────────────────────────────────────────────────────────────
  // Insert {name, age_group: first selected curriculum} into the skills table, add to the cloud, select.
  // Mirrors the edit route's add-skill precedent (dup 23505 is tolerated — just select the existing).
  const submitSkill = async () => {
    const name = newSkillName.trim()
    if (!name || busy) return
    const existing = skillNames.find((s) => s.toLowerCase() === name.toLowerCase())
    if (existing) {
      setWorkSkills((prev) => (prev.includes(existing) ? prev : [...prev, existing]))
      setMode('main')
      return
    }
    setBusy(true)
    try {
      // age_group = the first selected curriculum (grill). No curriculum selected → null (still usable).
      const { error } = await supabase.from('skills').insert({ name, age_group: curriculums[0] ?? null })
      if (error && error.code !== '23505') throw error
    } catch (e) {
      // DB unreachable → keep the skill in-memory so the flow proceeds (lands on this card, but won't
      // reach the shared skills table, so it won't show in other curriculum clouds later). Warn so a
      // "missing skill" ghost is debuggable rather than silent (polish-audit chunk 16 warning 2).
      console.warn('[SkillsSheet] skill insert failed — kept in-memory this session only', e)
    } finally {
      setBusy(false)
    }
    if (!panelRef.current) return // sheet closed while the insert was in flight — don't clobber state
    setSkillNames((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setWorkSkills((prev) => (prev.includes(name) ? prev : [...prev, name]))
    setNewSkillName('')
    setMode('main')
  }

  if (!mounted) return null

  const agesLabel = compressAges(curriculums)
  const title = agesLabel ? `Skills · ${agesLabel}` : 'Skills'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {/* scrim — plain rgba, tap to dismiss (commits) */}
      <div
        ref={scrimRef}
        onClick={commit}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'rgba(4,7,16,0.62)' }}
      />

      {/* sheet panel — SOLID (no backdrop-filter). Only transform/opacity animate. */}
      <div
        ref={(el) => { panelRef.current = el; dialogRef.current = el }}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'add' ? 'New skill' : 'Skills'}
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
            title={title}
            skillNames={skillNames}
            workSkills={workSkills}
            onToggle={toggleSkill}
            onNewSkill={() => setMode('add')}
            onDone={commit}
            onHandleDown={onHandleDown}
            onHandleMove={onHandleMove}
            onHandleUp={onHandleUp}
          />
        ) : (
          <AddForm
            value={newSkillName}
            inputRef={skillInputRef}
            busy={busy}
            onChange={setNewSkillName}
            onBack={() => setMode('main')}
            onSubmit={submitSkill}
            onHandleDown={onHandleDown}
            onHandleMove={onHandleMove}
            onHandleUp={onHandleUp}
          />
        )}
      </div>
    </div>
  )
}

// ── grab handle (copied from TypeAgeSheet) ───────────────────────────────────────────────────────────
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

// ── main content — the title caption + one chip cloud (+ "+ New skill") + Done ───────────────────────
function MainContent({
  title,
  skillNames,
  workSkills,
  onToggle,
  onNewSkill,
  onDone,
  onHandleDown,
  onHandleMove,
  onHandleUp,
}: {
  title: string
  skillNames: string[]
  workSkills: string[]
  onToggle: (name: string) => void
  onNewSkill: () => void
  onDone: () => void
  onHandleDown: (e: React.PointerEvent) => void
  onHandleMove: (e: React.PointerEvent) => void
  onHandleUp: (e: React.PointerEvent) => void
}) {
  return (
    <>
      {/* Done — text-only, top-right, Inter 600 16px white (the sibling's Done, verbatim) */}
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

      {/* title caption — eyebrow language (the sibling's section-header caption token) */}
      <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgb(125,138,163)', marginBottom: 12 }}>
        {title}
      </div>

      {/* chip cloud — scrolls if it overflows; empty result → just "+ New skill" (never a dead end).
          flex:'1 1 auto' + minHeight:0 makes the flex "min-content = 0" scroll behavior EXPLICIT (not
          reliant on the implicit overflow exception) so a large curriculum's cloud reliably scrolls
          inside the fixed 464 sheet on iOS/WebKit instead of spilling Done/"+ New skill" off-canvas. */}
      <div role="group" aria-label="Skills" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', alignContent: 'flex-start', flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {skillNames.map((name) => {
          const sel = workSkills.includes(name)
          // Curriculum-chip language (verbatim from TypeAgeSheet's age chips): selected = fill
          // rgb(34,48,78) + bright inset ring rgb(58,77,119); unselected = dim ring only.
          return (
            <button
              key={name}
              type="button"
              role="checkbox"
              aria-checked={sel}
              aria-label={name}
              onClick={() => onToggle(name)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                padding: '8px 16px',
                borderRadius: 19,
                border: 'none',
                cursor: 'pointer',
                background: sel ? 'rgb(34,48,78)' : 'transparent',
                boxShadow: sel ? 'rgb(58,77,119) 0px 0px 0px 1px inset' : 'rgb(42,52,80) 0px 0px 0px 1px inset',
                fontFamily: INTER,
                fontWeight: 600,
                fontSize: 13.5,
                color: sel ? 'rgb(255,255,255)' : 'rgb(159,176,200)',
              }}
            >
              {name}
            </button>
          )
        })}
        {/* "+ New skill" (the sibling's "+ Add" affordance language) */}
        <button
          type="button"
          onClick={onNewSkill}
          aria-label="Add a skill"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: INTER, fontWeight: 600, fontSize: 13, color: 'rgb(159,176,200)' }}
        >
          + New skill
        </button>
      </div>
      {/* No trailing spacer: the chip cloud above is now `flex:1` and owns the remaining height (chips
          pack top-left via alignContent:flex-start), so a spacer would only steal scroll space. */}
    </>
  )
}

// ── add-skill mini-form (the sibling's 8h add-form pattern, verbatim) ────────────────────────────────
function AddForm({
  value,
  inputRef,
  busy,
  onChange,
  onBack,
  onSubmit,
  onHandleDown,
  onHandleMove,
  onHandleUp,
}: {
  value: string
  inputRef: React.RefObject<HTMLInputElement>
  busy: boolean
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

      {/* header row — back ‹ + heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{ minHeight: 44, minWidth: 44, margin: '-12px -12px -12px -14px', padding: '12px 12px 12px 14px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <BackChevron />
        </button>
        <span style={{ fontFamily: INTER, fontWeight: 700, fontSize: 16, letterSpacing: '-0.2px', color: 'rgb(255,255,255)' }}>New skill</span>
      </div>

      {/* field — text input only */}
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
          placeholder="Balance"
          aria-label="Skill name"
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

      {/* Add button — full width */}
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
        {busy ? 'Adding…' : 'Add skill'}
      </button>
    </>
  )
}
