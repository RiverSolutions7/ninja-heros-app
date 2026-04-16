import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Dev-only sink for browser-side errors. The `DevErrorForwarder` component
 * POSTs runtime errors, unhandled rejections, and console.error calls here
 * so they show up in the dev server terminal — no more screenshotting from
 * a phone to share a stack trace.
 *
 * Returns 404 in production so the endpoint effectively disappears once
 * shipped.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const kind = typeof payload.kind === 'string' ? payload.kind : 'unknown'
  const message = typeof payload.message === 'string' ? payload.message : ''
  const stack = typeof payload.stack === 'string' ? payload.stack : ''
  const source = typeof payload.source === 'string' ? payload.source : ''
  const href = typeof payload.href === 'string' ? payload.href : ''
  const ua = typeof payload.userAgent === 'string' ? payload.userAgent : ''

  // Build a compact single-header + indented-body format so it's easy to
  // pick out of the dev server tail.
  const header = `[browser-${kind}] ${message || '(no message)'}`
  const lines: string[] = [header]
  if (source) lines.push(`  at ${source}`)
  if (href) lines.push(`  href: ${href}`)
  if (ua) lines.push(`  ua:   ${ua}`)
  if (stack) {
    lines.push('  stack:')
    for (const s of stack.split('\n')) lines.push(`    ${s}`)
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'))

  return NextResponse.json({ ok: true })
}
