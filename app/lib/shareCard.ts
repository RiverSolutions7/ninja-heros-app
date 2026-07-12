// Client-side Share for a saved card (chunk 5; composition REBUILT chunk 12 — River device note
// 2026-07-12: the old render cover-cropped the photo with NO clip, so a tall photo painted across the
// whole canvas and the step text landed on top of it, with dead voids above/below). Hand-draws a card
// image on a <canvas> (NO html-to-image libs — no new deps) mirroring the NotesDoc's editorial look:
//   · a cover photo band at the top (cover-cropped INSIDE a clipped rect, never bleeding past it),
//     dissolving into the card base rgb(20,28,50) with the chunk-11.5 gradient blend;
//   · a SOLID panel below carrying eyebrow (orange caps, tracked) · title (Inter 800) · numbered
//     steps (orange numerals, white text, measured word-wrap) · the "Coach's cues" callout in its
//     authored colors · the skills micro-pills if there's room. Text is NEVER drawn over the photo.
//   · canvas fixed at 1080×1350 (4:5, the share-friendly portrait ratio). devicePixelRatio is
//     deliberately NOT multiplied in: this canvas is an offscreen EXPORT surface, and the correct DPR
//     handling for a shared PNG is a deterministic backing store (1080×1350 everywhere) — DPR scaling
//     is for on-screen crispness only and would make the artifact vary per device.
// Shares via navigator.share with the file when the platform supports file share; otherwise degrades
// to a text + cover-url share, and finally to a clipboard/no-op. Best-effort by design.
export interface ShareCardInput {
  title: string
  eyebrow: string
  photoUrl: string
  setupSteps: string[]
  cues: string
}

// ── layout constants (canvas px; the app frame is 390 wide → ≈ ×2.77) ────────────────────────────
const W = 1080
const H = 1350 // 4:5
const PAD = 84
const BAND = 540 // photo band height
const BLEND = 230 // the chunk-11.5 dissolve window at the band's bottom edge
const CONTENT_TOP = BAND + 56
const BOTTOM_PAD = 72

const BASE = 'rgb(20,28,50)' // the card base the photo dissolves into (NotesDoc/DevelopedCard fill)
const ACCENT = '#ff5a1f'
const TEXT = 'rgb(231,238,250)'
const MUTED = 'rgb(159,176,200)'
const CUES_HEAD = 'rgb(255,171,125)'
const HAIRLINE = 'rgb(42,52,80)'

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// Clamp a wrapped block to maxLines, ellipsizing the last kept line.
function clampLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, Math.max(1, maxLines))
  kept[kept.length - 1] = `${kept[kept.length - 1].replace(/[.,;:\s]+$/, '')}…`
  return kept
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// Resolve the app's real Inter family for canvas text: next/font registers a hashed family name and
// exposes it through --font-inter — the bare name "Inter" isn't installed, so without this the canvas
// silently falls back to the system face.
function interFamily(): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim()
    if (v) return `${v}, system-ui, sans-serif`
  } catch { /* ignore — fall through */ }
  return 'Inter, system-ui, sans-serif'
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // ctx.letterSpacing is broadly supported (Chrome 99+/Safari 17+); older engines just skip tracking.
  try { (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px` } catch { /* ignore */ }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ── measured layout (wrap first, then fit-reduce, then draw) ─────────────────────────────────────
interface StepBlock { n: number; lines: string[] }
interface Layout {
  titleLines: string[]
  steps: StepBlock[]
  cuesLines: string[] // empty = no callout
  showSkills: boolean
  height: number // total content height from CONTENT_TOP
}

const TITLE_LH = 68
const STEP_LH = 50
const STEP_INDENT = 64
const STEP_GAP = 20
const CUES_LH = 50
const CUES_PAD_X = 40
const CUES_PAD_Y = 34
const CUES_HEAD_H = 26
const CUES_HEAD_GAP = 18
const SKILL_H = 52
const EYEBROW_H = 27
const EYEBROW_GAP = 30
const TITLE_GAP = 34
const CUES_GAP = 38

function measure(ctx: CanvasRenderingContext2D, input: ShareCardInput, inter: string, hasSkills: boolean): Layout {
  const maxW = W - PAD * 2

  ctx.font = `800 60px ${inter}`
  setLetterSpacing(ctx, -1.5)
  const titleLines = wrapLines(ctx, input.title || 'Untitled station', maxW)
  setLetterSpacing(ctx, 0)

  ctx.font = `400 36px ${inter}`
  const steps: StepBlock[] = input.setupSteps
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s, i) => ({ n: i + 1, lines: wrapLines(ctx, s, maxW - STEP_INDENT) }))

  ctx.font = `italic 400 34px ${inter}`
  const cues = input.cues.trim()
  const cuesLines = cues ? wrapLines(ctx, cues, maxW - CUES_PAD_X * 2) : []

  const layout: Layout = { titleLines, steps, cuesLines, showSkills: hasSkills, height: 0 }
  layout.height = layoutHeight(layout)
  return layout
}

function layoutHeight(l: Layout): number {
  let h = EYEBROW_H + EYEBROW_GAP + l.titleLines.length * TITLE_LH + TITLE_GAP
  l.steps.forEach((s, i) => { h += s.lines.length * STEP_LH + (i < l.steps.length - 1 ? STEP_GAP : 0) })
  if (l.cuesLines.length) h += CUES_GAP + CUES_PAD_Y * 2 + CUES_HEAD_H + CUES_HEAD_GAP + l.cuesLines.length * CUES_LH
  if (l.showSkills) h += 40 + SKILL_H
  return h
}

// Reduce until the content fits the fixed 4:5 canvas: clamp a runaway title → drop skills → clamp
// cues → clamp long steps → drop cues → drop trailing steps. Every card ends up drawable; nothing
// ever overflows the panel. (The title clamp exists because the celebrate rename input has no
// maxLength — polish-audit chunk 12: a pathological title alone must not blow the invariant.)
function fit(l: Layout): Layout {
  const avail = H - CONTENT_TOP - BOTTOM_PAD
  const over = () => layoutHeight(l) > avail
  if (over() && l.titleLines.length > 3) l.titleLines = clampLines(l.titleLines, 3)
  if (over() && l.showSkills) l.showSkills = false
  if (over() && l.cuesLines.length > 2) l.cuesLines = clampLines(l.cuesLines, 2)
  if (over()) l.steps = l.steps.map((s) => ({ ...s, lines: clampLines(s.lines, 2) }))
  if (over()) l.cuesLines = []
  while (over() && l.steps.length > 1) l.steps = l.steps.slice(0, -1)
  l.height = layoutHeight(l)
  return l
}

async function renderCard(input: ShareCardInput, skills: string[] = []): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Real metrics need the real face — wait for the app's fonts (best-effort; never blocks forever).
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) } catch { /* ignore */ }
  const inter = interFamily()
  const cover = input.photoUrl ? await loadImage(input.photoUrl) : null

  // base — the whole canvas is the solid card base; the photo band sits on top of it.
  ctx.fillStyle = BASE
  ctx.fillRect(0, 0, W, H)

  // ── photo band (cover-crop CLIPPED to the band — the old bug was the missing clip) ────────────
  if (cover && cover.width > 0 && cover.height > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, W, BAND)
    ctx.clip()
    const s = Math.max(W / cover.width, BAND / cover.height)
    const dw = cover.width * s
    const dh = cover.height * s
    ctx.drawImage(cover, (W - dw) / 2, (BAND - dh) / 2, dw, dh)
    // the chunk-11.5 blend: the photo dissolves into the card base across the band's bottom edge.
    const grad = ctx.createLinearGradient(0, BAND - BLEND, 0, BAND)
    grad.addColorStop(0, 'rgba(20,28,50,0)')
    grad.addColorStop(1, 'rgba(20,28,50,1)')
    ctx.fillStyle = grad
    ctx.fillRect(0, BAND - BLEND, W, BLEND)
    ctx.restore()
  }
  // photo missing/failed → the band stays the solid base (composition + text geometry unchanged).

  // ── editorial panel ────────────────────────────────────────────────────────────────────────────
  const layout = fit(measure(ctx, input, inter, skills.length > 0))
  const maxW = W - PAD * 2
  ctx.textBaseline = 'top'
  let y = CONTENT_TOP

  // eyebrow — "SETUP · AGES X–Y" style: orange caps, tracked (the NotesDoc 10px-caps language scaled).
  ctx.fillStyle = ACCENT
  ctx.font = `700 27px ${inter}`
  setLetterSpacing(ctx, 6)
  ctx.fillText(input.eyebrow.toUpperCase(), PAD, y, maxW)
  setLetterSpacing(ctx, 0)
  y += EYEBROW_H + EYEBROW_GAP

  // title — Inter 800, tight
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 60px ${inter}`
  setLetterSpacing(ctx, -1.5)
  for (const line of layout.titleLines) {
    ctx.fillText(line, PAD, y)
    y += TITLE_LH
  }
  setLetterSpacing(ctx, 0)
  y += TITLE_GAP

  // numbered steps — orange numeral column + wrapped white text (never over the photo: y ≥ CONTENT_TOP)
  layout.steps.forEach((step, i) => {
    ctx.fillStyle = ACCENT
    ctx.font = `700 36px ${inter}`
    ctx.fillText(String(step.n), PAD, y)
    ctx.fillStyle = TEXT
    ctx.font = `400 36px ${inter}`
    step.lines.forEach((line, li) => {
      ctx.fillText(line, PAD + STEP_INDENT, y + li * STEP_LH)
    })
    y += step.lines.length * STEP_LH + (i < layout.steps.length - 1 ? STEP_GAP : 0)
  })

  // Coach's cues callout — authored colors (warm heading, italic body, hairline border on the base).
  if (layout.cuesLines.length) {
    y += CUES_GAP
    const calloutH = CUES_PAD_Y * 2 + CUES_HEAD_H + CUES_HEAD_GAP + layout.cuesLines.length * CUES_LH
    roundedRect(ctx, PAD, y, maxW, calloutH, 28)
    ctx.strokeStyle = HAIRLINE
    ctx.lineWidth = 2
    ctx.stroke()
    let cy = y + CUES_PAD_Y
    ctx.fillStyle = CUES_HEAD
    ctx.font = `700 26px ${inter}`
    setLetterSpacing(ctx, 4.5)
    ctx.fillText("COACH'S CUES", PAD + CUES_PAD_X, cy)
    setLetterSpacing(ctx, 0)
    cy += CUES_HEAD_H + CUES_HEAD_GAP
    ctx.fillStyle = TEXT
    ctx.font = `italic 400 34px ${inter}`
    for (const line of layout.cuesLines) {
      ctx.fillText(line, PAD + CUES_PAD_X, cy)
      cy += CUES_LH
    }
    y += calloutH
  }

  // skills micro-pills — outline pills, single row, only the ones that fit the width.
  if (layout.showSkills) {
    y += 40
    ctx.font = `600 27px ${inter}`
    let x = PAD
    for (const s of skills) {
      const tw = ctx.measureText(s).width
      const pw = tw + 44
      if (x + pw > W - PAD) break
      roundedRect(ctx, x, y, pw, SKILL_H, SKILL_H / 2)
      ctx.strokeStyle = HAIRLINE
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = MUTED
      ctx.fillText(s, x + 22, y + (SKILL_H - 27) / 2)
      x += pw + 14
    }
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

// Returns a short status string so the caller can flag limitations honestly if it wants.
export async function shareCard(input: ShareCardInput, skills: string[] = []): Promise<'shared' | 'text' | 'unavailable'> {
  const text = `${input.title} — ${input.eyebrow}`
  try {
    const blob = await renderCard(input, skills).catch(() => null)
    const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean }

    if (blob && typeof nav.share === 'function') {
      const file = new File([blob], `${input.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'card'}.png`, { type: 'image/png' })
      const data: ShareData & { files?: File[] } = { title: input.title, text, files: [file] }
      if (!nav.canShare || nav.canShare(data)) {
        await nav.share(data)
        return 'shared'
      }
    }

    if (typeof nav.share === 'function') {
      await nav.share({ title: input.title, text: input.photoUrl ? `${text}\n${input.photoUrl}` : text })
      return 'text'
    }

    if (navigator.clipboard && input.photoUrl) {
      await navigator.clipboard.writeText(`${text}\n${input.photoUrl}`)
    }
    return 'unavailable'
  } catch {
    // User-cancelled share or any failure — nothing to surface.
    return 'unavailable'
  }
}
