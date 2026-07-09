// Client helper for the AI title (chunk 5). AI names every card, but naming is NEVER a gate: every
// path has an instant fallback ("Station · Jul 9"), and the AI title swaps in quietly when it resolves.
//   - structured card  → the develop parse already gave a title (use it directly; no call needed).
//   - raw-note only     → titleFromText(note)         (POST /api/title mode:text)
//   - photo only        → titleFromPhoto(coverUrl)    (POST /api/title mode:vision on the cover)
// Any failure / offline / bad shape returns the fallback so the save + celebrate never block.

// Fallback title: capitalised type + '·' + short date, e.g. "Station · Jul 9".
export function fallbackTitle(type: string, now: Date = new Date()): string {
  const cap = type.charAt(0).toUpperCase() + type.slice(1)
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${cap} · ${date}`
}

async function requestTitle(payload: unknown): Promise<string | null> {
  try {
    const res = await fetch('/api/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { title?: unknown }
    return typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null
  } catch {
    return null
  }
}

export async function titleFromText(text: string): Promise<string | null> {
  const t = text.trim()
  if (!t) return null
  return requestTitle({ mode: 'text', text: t })
}

// Read a cover photo to base64 (strip the data-url prefix) and ask for a vision title. Accepts the
// captured File directly (preferred — no dependency on a blob: object URL that Continue may revoke) or
// a url to fetch. Returns null on any read/fetch failure so the caller falls back.
export async function titleFromPhoto(cover: File | string): Promise<string | null> {
  if (!cover) return null
  try {
    const blob = typeof cover === 'string' ? await (await fetch(cover)).blob() : cover
    const mediaType = blob.type || 'image/jpeg'
    const imageBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result)
        const comma = result.indexOf(',')
        resolve(comma >= 0 ? result.slice(comma + 1) : result)
      }
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(blob)
    })
    return requestTitle({ mode: 'vision', imageBase64, mediaType })
  } catch {
    return null
  }
}
