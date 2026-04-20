export async function register() {
  // Only run in Node.js runtime (not Edge), and only in production or when
  // explicitly enabled so it doesn't slow down every dev server restart.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.RUN_BACKFILL !== 'true'
  )
    return

  try {
    const { backfillComponents } = await import('./app/lib/backfillComponents')
    await backfillComponents()
  } catch (err) {
    console.error('[backfill] Component backfill failed:', err)
  }
}
