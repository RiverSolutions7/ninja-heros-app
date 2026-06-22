// @design-locked — built from the Capture.html export (the photo deck, STATE B).
// Visual source of truth: the export + C:\Users\river\.claude\plans\capture-port-plan.md.
// Natural-band sizing reimplemented in React (no <image-slot>); dev-hook swappers dropped.
// polish-audit: flag only a11y / tap-targets / state / motion-perf / bugs.
// CHUNK 4: centred natural-band photo + edge peeks + snap-swipe (browse). Swipe browses the
// active index; it does NOT reorder previewUrls (the cover is set in the reorder tray, Chunk 8).
'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const AR_MIN = 4 / 5
const AR_MAX = 16 / 9
const AR_DEFAULT = 4 / 3
const GUTTER = 40
const S = 0.8 // neighbour scale (recessed)
const DIM = 0.44 // neighbour shade opacity
const TUCK = 10 // px the neighbour tucks behind the centre
const SNAP = 58 // px drag past which a swipe commits
const ANIM = 'transform .3s cubic-bezier(.25,.8,.3,1), opacity .24s ease' // smooth glide, no catch

const clampAR = (w: number, h: number) => Math.max(AR_MIN, Math.min(AR_MAX, w / h))

function fitCenter(ar: number, dw: number, dh: number) {
  const availW = Math.max(120, dw - GUTTER * 2)
  const maxH = dh * 0.96
  let w = availW
  let h = w / ar
  if (h > maxH) {
    h = maxH
    w = h * ar
  }
  return { w, h }
}

export default function PhotoDeck({ previewUrls, onRemove }: { previewUrls: string[]; onRemove: (index: number) => void }) {
  const deckRef = useRef<HTMLDivElement | null>(null)
  const centerRef = useRef<HTMLDivElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const peekPrevRef = useRef<HTMLDivElement | null>(null)
  const peekNextRef = useRef<HTMLDivElement | null>(null)
  const prevImgRef = useRef<HTMLDivElement | null>(null)
  const prevShadeRef = useRef<HTMLDivElement | null>(null)
  const nextImgRef = useRef<HTMLDivElement | null>(null)
  const nextShadeRef = useRef<HTMLDivElement | null>(null)

  const [dims, setDims] = useState<Record<string, number>>({}) // url → clamped aspect
  const [active, setActive] = useState(0)
  const cBox = useRef({ w: 300, h: 380 })
  const pBox = useRef({ w: 0, h: 0 })
  const nBox = useRef({ w: 0, h: 0 })
  const drag = useRef({ on: false, startX: 0, shift: 0, pid: -1, moved: false, onPrev: false, onNext: false })

  const n = previewUrls.length

  useEffect(() => {
    if (active > n - 1) setActive(Math.max(0, n - 1))
  }, [n, active])

  // preload each photo's clamped aspect (peeks need to be sized before they slide in)
  useEffect(() => {
    previewUrls.forEach((url) => {
      if (dims[url]) return
      const im = new Image()
      im.onload = () => {
        if (im.naturalWidth && im.naturalHeight) setDims((d) => ({ ...d, [url]: clampAR(im.naturalWidth, im.naturalHeight) }))
      }
      im.src = url
    })
  }, [previewUrls, dims])

  // bounded (no wrap): out-of-range → undefined, so the cover has nothing on its left and the
  // last photo nothing on its right — a clear start + a clear finish.
  const arOf = (i: number) => (i >= 0 && i < n ? dims[previewUrls[i]] ?? AR_DEFAULT : AR_DEFAULT)
  const urlOf = (i: number): string | undefined => (i >= 0 && i < n ? previewUrls[i] : undefined)

  // continuous slot map: e = signed distance from centre (0 = centred, ±1 = side slot)
  function slotAt(e: number, baseW: number) {
    const ae = Math.abs(e)
    const scale = ae >= 1 ? S : 1 - (1 - S) * ae
    const dim = ae >= 1 ? DIM : DIM * ae
    const sw = baseW * scale
    const dw = deckRef.current?.clientWidth || 393
    let cx: number
    if (e === 0) cx = dw / 2
    else {
      const sgn = e > 0 ? 1 : -1
      const nearEdge = dw / 2 + sgn * (cBox.current.w / 2)
      const edgeCx = nearEdge + sgn * (sw / 2 - TUCK)
      if (ae <= 1) cx = dw / 2 + (edgeCx - dw / 2) * ae
      else cx = edgeCx + sgn * sw * (ae - 1)
    }
    const opacity = ae >= 2 ? 0 : ae > 1 ? 2 - ae : 1
    return { cx, scale, dim, opacity }
  }

  function applyCard(el: HTMLElement | null, baseW: number, baseH: number, e: number, shadeEl?: HTMLElement | null) {
    if (!el) return
    const st = slotAt(e, baseW)
    const dh = deckRef.current?.clientHeight || 600
    const tx = st.cx - baseW / 2
    const ty = dh / 2 - baseH / 2
    el.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${st.scale.toFixed(4)})`
    el.style.opacity = st.opacity.toFixed(3)
    // z-index follows the slot: the photo nearest centre sits on top, so the incoming card
    // slides OVER the outgoing one (kills the ugly mid-transition overlap, where the leaving
    // photo — fixed z-index 3 — used to cover the arriving one).
    el.style.zIndex = String(Math.round(50 - Math.abs(e) * 20))
    if (shadeEl) shadeEl.style.opacity = st.dim.toFixed(3)
  }

  function setAnim(on: boolean) {
    const t = on ? ANIM : 'none'
    ;[centerRef.current, peekPrevRef.current, peekNextRef.current].forEach((el) => {
      if (el) el.style.transition = t
    })
  }

  // promote layers only while a swipe is in flight; drop at rest (§8 — no permanent will-change)
  function setWC(on: boolean) {
    const v = on ? 'transform, opacity' : 'auto'
    ;[centerRef.current, peekPrevRef.current, peekNextRef.current].forEach((el) => {
      if (el) el.style.willChange = v
    })
  }

  function render(shift: number) {
    applyCard(centerRef.current, cBox.current.w, cBox.current.h, shift)
    if (n >= 2) {
      applyCard(peekNextRef.current, nBox.current.w, nBox.current.h, 1 + shift, nextShadeRef.current)
      applyCard(peekPrevRef.current, pBox.current.w, pBox.current.h, -1 + shift, prevShadeRef.current)
    }
  }

  function layout() {
    const deck = deckRef.current
    if (!deck || !wrapRef.current) return
    const dw = deck.clientWidth || 393
    const dh = deck.clientHeight || 600
    const cf = fitCenter(arOf(active), dw, dh)
    cBox.current = cf
    wrapRef.current.style.width = `${cf.w.toFixed(2)}px`
    wrapRef.current.style.height = `${cf.h.toFixed(2)}px`
    const hasPrev = active > 0
    const hasNext = active < n - 1
    if (hasPrev) {
      const pf = fitCenter(arOf(active - 1), dw, dh)
      pBox.current = pf
      if (peekPrevRef.current) {
        peekPrevRef.current.hidden = false
        peekPrevRef.current.style.width = `${pf.w.toFixed(2)}px`
        peekPrevRef.current.style.height = `${pf.h.toFixed(2)}px`
      }
      if (prevImgRef.current) prevImgRef.current.style.backgroundImage = `url("${urlOf(active - 1)}")`
    } else if (peekPrevRef.current) {
      peekPrevRef.current.hidden = true
    }
    if (hasNext) {
      const nf = fitCenter(arOf(active + 1), dw, dh)
      nBox.current = nf
      if (peekNextRef.current) {
        peekNextRef.current.hidden = false
        peekNextRef.current.style.width = `${nf.w.toFixed(2)}px`
        peekNextRef.current.style.height = `${nf.h.toFixed(2)}px`
      }
      if (nextImgRef.current) nextImgRef.current.style.backgroundImage = `url("${urlOf(active + 1)}")`
    } else if (peekNextRef.current) {
      peekNextRef.current.hidden = true
    }
    setAnim(false)
    render(0)
  }

  useLayoutEffect(() => {
    layout()
    const deck = deckRef.current
    if (!deck) return
    const ro = new ResizeObserver(() => layout())
    ro.observe(deck)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dims, n])

  function commit(dir: number) {
    setAnim(true)
    requestAnimationFrame(() => render(dir > 0 ? 1 : -1))
    window.setTimeout(() => {
      setAnim(false)
      setWC(false)
      // dragged right (dir>0) → previous to front; dragged left (dir<0) → next to front. Clamped
      // to [0, n-1] — no wrap, so you stop at the cover and at the last photo.
      setActive((a) => Math.max(0, Math.min(n - 1, a + (dir > 0 ? -1 : 1))))
    }, 340)
  }

  function onPointerDown(e: React.PointerEvent) {
    const tgt = e.target as HTMLElement
    if (tgt.closest('[data-nodrag]')) return
    if (n < 2) return
    drag.current = {
      on: true,
      startX: e.clientX,
      shift: 0,
      pid: e.pointerId,
      moved: false,
      onPrev: !!peekPrevRef.current?.contains(tgt),
      onNext: !!peekNextRef.current?.contains(tgt),
    }
    setWC(true)
    setAnim(false)
    try { deckRef.current?.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.on) return
    if (Math.abs(e.clientX - drag.current.startX) > 6) drag.current.moved = true
    let s = (e.clientX - drag.current.startX) / SNAP
    // rubber-band at the ends — nothing before the cover / after the last photo
    if (active === 0 && s > 0) s *= 0.2
    if (active === n - 1 && s < 0) s *= 0.2
    if (s > 1) s = 1 + (s - 1) * 0.3
    if (s < -1) s = -1 + (s + 1) * 0.3
    drag.current.shift = s
    render(s)
  }
  function endDrag() {
    if (!drag.current.on) return
    const { shift: s, moved, onPrev, onNext } = drag.current
    drag.current.on = false
    try { deckRef.current?.releasePointerCapture(drag.current.pid) } catch { /* ignore */ }
    if (s <= -0.5 && active < n - 1) commit(-1)
    else if (s >= 0.5 && active > 0) commit(1)
    else if (!moved && onNext && active < n - 1) commit(-1) // tap right peek → glides to front
    else if (!moved && onPrev && active > 0) commit(1) // tap left peek → glides to front
    else {
      setAnim(true)
      requestAnimationFrame(() => render(0))
      window.setTimeout(() => { setAnim(false); setWC(false) }, 340)
    }
  }

  return (
    <div
      ref={deckRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{ position: 'relative', flex: 1, minHeight: 0, alignSelf: 'stretch', touchAction: 'none' }}
    >
      {/* previous peek */}
      <div
        ref={peekPrevRef}
        aria-hidden="true"
        hidden
        style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, transformOrigin: 'center center', borderRadius: 26, overflow: 'hidden', background: '#0c1322', boxShadow: '0 22px 46px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <div ref={prevImgRef} style={{ position: 'absolute', inset: 0, background: '#16203a center/cover no-repeat', transform: 'translateZ(0)' }} />
        <div ref={prevShadeRef} style={{ position: 'absolute', inset: 0, background: '#05070f', opacity: 0 }} />
      </div>

      {/* next peek */}
      <div
        ref={peekNextRef}
        aria-hidden="true"
        hidden
        style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, transformOrigin: 'center center', borderRadius: 26, overflow: 'hidden', background: '#0c1322', boxShadow: '0 22px 46px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <div ref={nextImgRef} style={{ position: 'absolute', inset: 0, background: '#16203a center/cover no-repeat', transform: 'translateZ(0)' }} />
        <div ref={nextShadeRef} style={{ position: 'absolute', inset: 0, background: '#05070f', opacity: 0 }} />
      </div>

      {/* centred photo card */}
      <div ref={centerRef} style={{ position: 'absolute', left: 0, top: 0, zIndex: 3, transformOrigin: 'center center' }}>
        <div ref={wrapRef} style={{ position: 'relative', width: 300, height: 380 }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 30,
              overflow: 'hidden',
              background: 'linear-gradient(165deg,#1b2647 0%,#101a33 55%,#0a1124 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 2px rgba(0,0,0,0.4), 0 26px 50px rgba(0,0,0,0.6), 0 8px 18px rgba(0,0,0,0.5)',
            }}
          >
            {urlOf(active) && (
              <img
                key={urlOf(active)}
                src={urlOf(active)}
                alt="Captured setup"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget
                  const url = urlOf(active)
                  if (url && img.naturalWidth && img.naturalHeight) {
                    setDims((d) => (d[url] ? d : { ...d, [url]: clampAR(img.naturalWidth, img.naturalHeight) }))
                  }
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'translateZ(0)' }}
              />
            )}
          </div>

          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: 30, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent 22%)' }} />

          <button
            type="button"
            data-nodrag
            aria-label="Delete photo"
            onClick={() => onRemove(active)}
            className="transition-transform active:scale-[0.9]"
            style={{ position: 'absolute', top: 0, right: 0, zIndex: 4, padding: 14, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.92)', background: '#0c1018', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 12px rgba(0,0,0,0.5)' }}>
              <svg width="14" height="15" viewBox="0 0 14 15" fill="none" aria-hidden="true">
                <path d="M1.5 3.5h11M5 3.5V2.2c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9v1.3M2.7 3.5l.6 9c0 .6.5 1 1 1h5.4c.5 0 1-.4 1-1l.6-9M5.6 6.2v5M8.4 6.2v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
