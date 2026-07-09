// Dev-only harness (NOT design-locked): renders a sliced Claude Design export frame at phone
// width for side-by-side fidelity screenshots against the rebuilt /log screen.
// Reads design-export/capture/frames/<id>*.html server-side and injects its <body>. 404 in prod.
import { notFound } from 'next/navigation'
import fs from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'

// NOTE: the fs reads below make Turbopack's NFT tracer emit one build-time warning for this
// dev-only route. It's harmless — the route force-404s in production before any fs call runs.
const FRAMES_DIR = path.join(process.cwd(), 'design-export', 'capture', 'frames')

// Rewrite the frame's relative asset path to the public copy, and the literal "Inter" font-family
// to the self-hosted --font-inter variable so the frame renders in real Inter without a CDN fetch.
function fixAssets(html: string): string {
  return html
    .replace(/\.\/course-photo\.svg/g, '/design-export-assets/course-photo.svg')
    .replace(/Inter, /g, 'var(--font-inter), ')
}

function resolveFrameFile(id: string): string | null {
  if (!/^[a-z0-9-]+$/i.test(id)) return null
  let files: string[]
  try {
    files = fs.readdirSync(FRAMES_DIR)
  } catch {
    return null
  }
  // Match "<id>.html" or "<id>-<anything>.html" (e.g. 8a → 8a-photo-loaded.html).
  const match = files.find((f) => f === `${id}.html` || f.startsWith(`${id}-`))
  return match ? path.join(FRAMES_DIR, match) : null
}

function extractBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return m ? m[1] : html
}

export default async function FramePage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound()

  const { id } = await params
  const file = resolveFrameFile(id)
  if (!file) notFound()

  const raw = fs.readFileSync(file, 'utf8')
  const body = fixAssets(extractBody(raw))

  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div
        style={{ position: 'relative', width: 390, height: 844, background: 'rgb(8,12,26)', overflow: 'hidden', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </div>
  )
}
