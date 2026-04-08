import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function extractMeta(
  html: string,
  baseUrl: string
): { title: string | null; thumbnail_url: string | null } {
  // og:title — try both attribute orderings
  const title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i)?.[1] ??
    html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
    null

  // og:image — try both attribute orderings
  const rawImage =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i)?.[1] ??
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']*)["']/i)?.[1] ??
    null

  // Resolve relative image URLs against the page base
  let thumbnail_url: string | null = null
  if (rawImage) {
    try {
      thumbnail_url = new URL(rawImage, baseUrl).href
    } catch {
      thumbnail_url = rawImage
    }
  }

  return { title: title?.trim() || null, thumbnail_url }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url') ?? ''

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const domain = parsed.hostname.replace(/^www\./, '')

  try {
    const res = await fetch(parsed.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json({ domain, title: null, thumbnail_url: null })
    }

    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html')) {
      return NextResponse.json({ domain, title: null, thumbnail_url: null })
    }

    // Read only the first 64KB — og tags are always in <head>
    const reader = res.body?.getReader()
    if (!reader) {
      return NextResponse.json({ domain, title: null, thumbnail_url: null })
    }

    const chunks: Uint8Array[] = []
    let total = 0
    const limit = 64 * 1024

    while (total < limit) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      total += value.byteLength
    }
    reader.cancel()

    const html = new TextDecoder().decode(
      Buffer.concat(chunks.map((c) => Buffer.from(c)))
    )

    const { title, thumbnail_url } = extractMeta(html, parsed.href)
    return NextResponse.json({ domain, title, thumbnail_url })
  } catch {
    // Network failure, timeout, or blocked — return just the domain
    return NextResponse.json({ domain, title: null, thumbnail_url: null })
  }
}
