import Link from 'next/link'

export default function LogComponentPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="text-5xl mb-5">🧩</div>
      <h1 className="font-heading text-xl text-text-primary mb-2">Component logging</h1>
      <p className="text-text-muted text-sm mb-8">
        Coming in the next stage — log a standalone game, warmup, or station drill.
      </p>
      <Link
        href="/library?view=components"
        className="text-sm text-accent-fire font-semibold"
      >
        ← Back to Components
      </Link>
    </div>
  )
}
