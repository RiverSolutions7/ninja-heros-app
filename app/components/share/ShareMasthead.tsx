// ============================================================
// Share-page masthead — editorial brand lockup shown atop every
// public share URL (/plan/[id], /component/[id]). Outsiders see
// this first, so it has to signal "this is from a real product"
// instantly. Fire-red aura, big brandmark, small uppercase
// kicker + subtitle. No UI chrome.
// ============================================================

interface ShareMastheadProps {
  /** Small uppercase subtitle shown below the brandmark. e.g. "CLASS PLAN", "STATION". */
  subtitle: string
}

export default function ShareMasthead({ subtitle }: ShareMastheadProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Fire-red atmospheric wash — quiet on small phones, unmistakable on tablet */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-accent-fire/[0.16] via-accent-fire/[0.04] to-transparent pointer-events-none"
      />
      <div className="relative px-6 pt-14 pb-9 max-w-2xl mx-auto">
        <p className="text-accent-fire text-[10px] font-heading tracking-[0.34em] uppercase mb-3">
          Just Tumble
        </p>
        <h1
          className="font-heading text-text-primary leading-[0.95]"
          style={{ fontSize: 'clamp(32px, 9vw, 48px)' }}
        >
          Ninja H.E.R.O.S.
        </h1>
        <p className="text-text-dim text-[11px] font-heading uppercase tracking-[0.24em] mt-3">
          {subtitle}
        </p>
      </div>
    </div>
  )
}
