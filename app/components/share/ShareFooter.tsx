// ============================================================
// Share-page footer — closing brandmark that brackets the
// document. Fire-red dots + kerning-out lockup. Signals end of
// content; echoes the masthead's opening statement.
// ============================================================

export default function ShareFooter() {
  return (
    <div className="mt-20 text-center px-6">
      <div className="inline-flex items-center gap-2.5 text-[10px] font-heading text-text-dim/50 tracking-[0.28em]">
        <span className="w-1 h-1 rounded-full bg-accent-fire/60" />
        <span>NINJA H.E.R.O.S. · JUST TUMBLE</span>
        <span className="w-1 h-1 rounded-full bg-accent-fire/60" />
      </div>
    </div>
  )
}
