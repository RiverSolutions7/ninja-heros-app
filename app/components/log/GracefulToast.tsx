// @design-locked — the graceful-state toast chip, built from design-export/capture/frames/
// 15b-no-speech-heard.html (tpl785: frosted chip rgba(12,19,34,0.78) + blur(20), 1px border
// rgba(255,255,255,0.12), radius 14, padding 6/13, Inter 400 12.5px rgb(205,216,234), centered at
// bottom 120). Reused for the save-failure surfaces (chunk 9) — same authored surface, copy varies.
// FREEZE: the blur is STATIC — the toast appears/disappears by mount, nothing animates over it.
// polish-audit: flag only a11y / state / bugs — not the design values.
'use client'

export default function GracefulToast({
  text,
  bottom = 120,
  assertive = false,
}: {
  text: string
  /** Offset above the layout-viewport bottom (frame-authored 120; raised when the dock is raised). */
  bottom?: number
  /** role=alert (errors, announced immediately) vs role=status (reassurance, polite). */
  assertive?: boolean
}) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center', zIndex: 40, pointerEvents: 'none' }}>
      <div
        role={assertive ? 'alert' : 'status'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          margin: '0 16px', // safety on narrow screens — invisible at the frame width (single line)
          padding: '6px 13px',
          borderRadius: 14,
          background: 'rgba(12,19,34,0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'rgba(0,0,0,0.4) 0px 12px 26px',
        }}
      >
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontWeight: 400, fontSize: 12.5, color: 'rgb(205,216,234)', textAlign: 'center' }}>
          {text}
        </span>
      </div>
    </div>
  )
}
