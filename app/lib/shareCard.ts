// Client-side Share for a saved card (chunk 5). Hand-draws a card image on a <canvas> (NO html-to-image
// libs — no new deps) in the notes-doc look (cover band, eyebrow, title, numbered steps, cues) and
// shares it via navigator.share with the file when the platform supports file share; otherwise it
// degrades to a text + cover-url share, and finally to a clipboard/no-op. Best-effort by design.
export interface ShareCardInput {
  title: string
  eyebrow: string
  photoUrl: string
  setupSteps: string[]
  cues: string
}

const W = 1080
const PAD = 72

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function renderCard(input: ShareCardInput): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const cover = input.photoUrl ? await loadImage(input.photoUrl) : null
  const bandH = cover ? 620 : 0
  const inter = 'Inter, system-ui, sans-serif'

  // First pass to measure the total height, then size the canvas and draw for real.
  const measure = (h: number) => {
    canvas.width = W
    canvas.height = h
  }
  measure(2000)

  // background
  ctx.fillStyle = '#080c1a'
  ctx.fillRect(0, 0, W, canvas.height)

  // cover band
  if (cover) {
    const scale = Math.max(W / cover.width, bandH / cover.height)
    const dw = cover.width * scale
    const dh = cover.height * scale
    ctx.drawImage(cover, (W - dw) / 2, (bandH - dh) / 2, dw, dh)
    const grad = ctx.createLinearGradient(0, bandH - 260, 0, bandH)
    grad.addColorStop(0, 'rgba(8,12,26,0)')
    grad.addColorStop(1, 'rgba(8,12,26,0.95)')
    ctx.fillStyle = grad
    ctx.fillRect(0, bandH - 260, W, 260)
  }

  let y = bandH + (cover ? -40 : PAD + 40)

  // eyebrow
  ctx.fillStyle = '#ff5a1f'
  ctx.font = `700 26px ${inter}`
  ctx.fillText(input.eyebrow.toUpperCase(), PAD, y)
  y += 58

  // title
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 64px ${inter}`
  for (const line of wrapLines(ctx, input.title, W - PAD * 2)) {
    ctx.fillText(line, PAD, y)
    y += 74
  }
  y += 36

  // steps
  ctx.font = `400 34px ${inter}`
  input.setupSteps.forEach((step, i) => {
    ctx.fillStyle = '#ff5a1f'
    ctx.font = `700 34px ${inter}`
    ctx.fillText(String(i + 1), PAD, y)
    ctx.fillStyle = '#e7eefa'
    ctx.font = `400 34px ${inter}`
    for (const line of wrapLines(ctx, step, W - PAD * 2 - 56)) {
      ctx.fillText(line, PAD + 56, y)
      y += 48
    }
    y += 14
  })

  // cues
  const cues = input.cues.trim()
  if (cues) {
    y += 24
    ctx.fillStyle = '#ffab7d'
    ctx.font = `700 24px ${inter}`
    ctx.fillText("COACH'S CUES", PAD, y)
    y += 46
    ctx.fillStyle = '#c7d2e6'
    ctx.font = `italic 400 32px ${inter}`
    for (const line of wrapLines(ctx, cues, W - PAD * 2)) {
      ctx.fillText(line, PAD, y)
      y += 46
    }
  }
  y += PAD

  // Re-draw at the exact measured height (canvas was oversized; crop by re-rendering).
  const finalH = Math.max(y, bandH + 200)
  const final = document.createElement('canvas')
  final.width = W
  final.height = finalH
  const fctx = final.getContext('2d')
  if (!fctx) return null
  fctx.drawImage(canvas, 0, 0)

  return new Promise((resolve) => final.toBlob((b) => resolve(b), 'image/png'))
}

// Returns a short status string so the caller can flag limitations honestly if it wants.
export async function shareCard(input: ShareCardInput): Promise<'shared' | 'text' | 'unavailable'> {
  const text = `${input.title} — ${input.eyebrow}`
  try {
    const blob = await renderCard(input).catch(() => null)
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
