---
description: Inspect gesture hooks for threshold values, instrumentation coverage, and conflict potential.
---

Audit every gesture-handling hook in `app/hooks/` and report on their health. Gesture bugs are the most expensive class of polish bug to debug remotely, so this command exists to catch drift before it ships.

### Scope

Look at (via Glob + Read):
- `app/hooks/useLongPress.ts`
- `app/hooks/useSwipeReveal.ts` (if still present)
- `app/hooks/useVoiceNote.ts`
- Any new hook matching `app/hooks/use*.ts` that wires pointer / touch / mouse events.

If the user passed a specific hook name as an argument (e.g. `/gesture-test useLongPress`), scope to that one.

### For each hook, check and report

1. **Threshold values.** Extract and list the numeric thresholds:
   - `CLAIM_DISTANCE` / movement cancel thresholds (in px)
   - Time windows (debounce, long-press delay, first-move window, etc.)
   - Horizontal/vertical bias ratios
   - Minimum pointermove event counts before claim
2. **Compare against iOS HIG convention** (from `memory/MEMORY.md` HIG Quick Reference). Flag any values outside the recommended bands as `⚠ drift`.
3. **Pointer event coverage.** Every hook should handle all four of `pointerdown`, `pointermove`, `pointerup`, `pointercancel` — even if `pointercancel` only cleans up. Missing handler = `❌ blocker`.
4. **Dev-mode instrumentation.** Every state transition should emit `[gesture:name] event=... x=... y=... claimed=...` via a `console.log` guarded by `process.env.NODE_ENV === 'development'`. Missing instrumentation = `⚠ warning` — we rely on it during inspect.dev debugging.
5. **Consumer hygiene.** Grep for callsites that use the hook (e.g. `useLongPress(` in `app/components/...`) and confirm they spread the returned handlers and any recommended inline CSS (e.g. `LONG_PRESS_STYLE`). Missing CSS spread = `⚠ warning` (could produce iOS text-selection bubbles or tap highlight artifacts on long-press).
6. **Conflict potential.** Does this hook share a target with any other gesture (drag, scroll, click, another gesture hook on the same element)? If so, does it handle claim/cancel correctly when another gesture wins? Note any unresolved conflict.

### Report format

```
# Gesture Audit — {hook names}

## {hookName.ts}

**Thresholds:**
- CLAIM_DISTANCE = {value} ({✓ | ⚠ — why})
- DELAY_MS = {value} ({✓ | ⚠ — why})
- …

**Pointer coverage:** {✓ all four | ❌ missing: pointercancel | …}
**Instrumentation:** {✓ present on all transitions | ⚠ missing on pointerup | …}
**Consumer hygiene:** {✓ {N} callsites checked | ⚠ {file:line} missing LONG_PRESS_STYLE}
**Conflict potential:** {none | note}

**Findings:** {numbered blocker/warning list with remediation one-liners}
```

End with a one-line summary across all hooks: `Gesture layer: clean / N warnings / M blockers`.

This is a read-only audit. Do NOT modify any hooks — just report.
