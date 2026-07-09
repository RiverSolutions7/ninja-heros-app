# Log-flow rebuild — build map (orchestrator state)

*Branch `log-rebuild` (off master). Rebuilds the log-a-component flow from the certified
Claude Design export under the Fidelity Law. The OLD wizard (S1Setup → VoiceScreen/S3Photo →
Card1Skills → CardReview → Reveal → Satisfaction) stays untouched until cutover.*

## Sources of truth
| What | Where |
|---|---|
| Pixel truth (frames, inline styles) | `design-export/capture/frames/*.html` — sliced from the certified export (`C:\Users\river\Downloads\Capture screen design_files\Capture Screen.dc.html`). One file per frame, standalone-renderable. `course-photo.svg` is a stand-in (the original placeholder photo wasn't captured; layout truth holds, photo content is irrelevant). |
| Motion truth (ms/springs, reduced-motion) | `design-export/capture/motion-dc.js` — the export's live logic class. Recording rig `{bloom:190, stagger:28, bounce:0, xfade:280}` · develop rig `{total:940, stagger:105, settle:8, scrim:1}` · save spring `390ms, ζ=0.591, ωn=6.6` sampled to 32 WAAPI keyframes. Copy its beat structure, don't re-derive. |
| Decisions / logic | vault `messy/log-flow-redesign-decisions.md` (the ledger). Chunk briefs quote the relevant sections. |
| Map + acceptance criteria | `%TEMP%\handoff.md` + this file. |

## THE FIDELITY LAW (non-negotiable)
1. Build from the exact export only — never a proxy, never by-eye.
2. Match to the pixel/ms. Reuse an existing primitive only where it ALREADY matches; otherwise diverge screen-locally.
3. Mark built files `@design-locked` (header comment). /polish checks a11y/states/bugs but never "fixes" design-sourced visuals.

## Pinned build tokens (from the export + ledger §8/§8.5)
- **Accent = `#ff5a1f`** (the export uses rgb(255,90,31) throughout; `#f97316` is dead).
- Inter only: titles 800 tight (−0.5px), body 400, labels 600 caps wide. Russo One/Nunito banned in this flow.
- Surfaces: frosted glass ONLY for chrome floating over the photo; solid lit navy (1px top highlight + shadow below) for the dock + anything that animates.
- **Freeze rule:** never animate over a `backdrop-filter`. Narrow amendment: transient context menus may frost with STATIC blur while open.
- Reduced motion = crossfade everywhere (the motion script shows each fallback).
- A11y: AA contrast, 44px min targets, VoiceOver labels.
- Radii: dock ~22 · tiles ~16 · chips ~14. 4pt grid. Hairlines only as 1px inner borders on glass.

## New code layout
- Route: `app/log/page.tsx` (new flow lives here until cutover; old `/library/log-component` untouched).
- Components: `app/components/log/` — `Capture.tsx`, `DevelopedCard.tsx`, `NotesDoc.tsx`, `Celebrate.tsx`, `TypeAgeSheet.tsx`, `PhotoSheet.tsx`, `SortBins.tsx` (+ small pieces as needed).
- Dev harness: `app/dev/frames/[id]/page.tsx` — renders a sliced export frame at phone width for side-by-side screenshots (dev-only).
- Reuse inventory (only where it already matches): `app/hooks/useVoiceNote.ts` (permission/error/no-speech/typing logic), photo/video upload helpers, Supabase buckets. dnd-kit is already a dep (old ReorderTray).
- Backend (new, alongside old): `/api/develop` (structured parse: title · SETUP steps · CUES · skills · equipment · duration — clone the parse-component SDK pattern), `/api/title` (lightweight, text + vision modes, Haiku-class). Migration **017** (handoff said 018; 016 is the latest real file): `setup_steps` (jsonb), `cues text`, `photos jsonb` (ordered + cover) — duration/equipment stay hidden data; columns tenancy-ready (`gym_id` bolts on later). **Applying the migration = a River gate.**

## Chunk plan (build order; ✅ = done, committed)
**Group A — the hero spine → iPhone gate A**
1. ☐ **Shell + rest states** — `/log` route + screen shell + `Capture` rest: frames `8a`, `8b`, `8a-w`. Header (back ‹, contextual Save), type/age chip, photo hero (natural whole-photo, pill-progress D2 dots: active 14×5px white pill, inactives 5px rgba-white), frosted photo chip, idle dock ("Add a note… (optional)" label = the typing door — tapping it opens the keyboard; Aa dead), 8b empty stage (P3 photo-stack button, "What did you build?" / "Add the course photos — or describe it and the notes write themselves."), W1 whisper lozenge (static shell + `visible` prop; trigger wiring comes with PhotoSheet). + dev frames harness.
2. ☐ **Recording** — frame `8c` + recording rig. Todoist waveform (center-mirrored ~3px bars, 2px gap, ramp #5b6b86→#e7eefa), 54px Continuity ✓ (flat #ff5a1f), bloom in/out beats + timer per motion-dc.js, wired to `useVoiceNote`. Re-record = small "↺ try again".
3. ☐ **Develop** — frame `8d` + develop rig + `/api/develop`. "Structure it ✨" = prominent post-voice, OPT-IN (raw note is the default state). Glimpse: eyebrow "STATION · AGES 5–7" (never duration), title, 2 steps, S2 micro-pills, "Review & edit ›" (no ✎ chip — dead concept). Cascade 940/105/8/100%. Header Save disappears the moment the card develops.
4. ☐ **Notes** — frames `8e`, `8e-edit`. Editorial column (Inter 200 ~22px numerals #5b6b86), warm "Coach's cues" callout, skills = S2 micro-pills footer (no fill, 1px #2a3450, r9, Inter 600 10px #9fb0c8). E1 inline-quiet editing (tap step → inline field, hairline underline; press-drag reorder; cues edit inline). Per-row ⋯ → M3 frosted anchored menu: **Merge with next · Delete** only (Merge grayed on last step; NO split), rgba(26,34,56,0.72) static blur, 44px rows, invoked row stays bright, ~150ms scale-in.
5. ☐ **Save + celebrate** — frame `8f` + save morph + `/api/title` + migration 017 + save wiring. Contextual handoff: header Save pre-develop ONLY (photo-only = 2 taps); "Save to library" owns post-develop and launches the grow morph (390ms spring → thumb slot, msFadeOut 150ms, celeb beats per motion-dc.js). "Logged. Forever." + Share (client-side card→image; degrade to text+photo). AI titles every card (structured → inferred; raw → title-only text pass; photo-only → title-only vision pass on the cover; fallback "Station · Jul 9"); tap-to-rename; never a gate. Back ‹ post-develop = draft-discard ask. **⛔ migration approval gate before applying.**

**Group B — sheets → iPhone gate B**
6. ☐ **TypeAgeSheet** — frames `8g`, `8h`. Type pills (defaults text-only) + multi-select age chips (no ✓ marks) + "Done" text-only Inter 600 white top-right. "+ Add type" inline mini-form = name → Add type (no toggle; plannable defaults TRUE in data). Monogram auto-tile for CUSTOM types only. D2 spring-settle arrival. **Session checkpoint: auto-opens once per APP LAUNCH (first log); silent last-used chip after; chip tap reopens.**
7. ☐ **PhotoSheet** — frame `8i`. Tiles, drag reorder (first = cover, tag follows), ✕ per tile, "+" add, "⊟ Sort into separate stations" row (~13.5px text) visible at 2+ photos. Wire the whisper: once per capture, at the 3rd photo, auto-fades ~4s.

**Group C — multi-station + graceful → iPhone gate C**
8. ☐ **SortBins + stepper** — frames `8j`, `13a-1`, `13a-2`, `13c`, `13b`. Drag photos into labeled bins (a wide photo may enter multiple bins; N=1 = normal flow, no bins). Rhythm A: one at a time, fully — land on Station 1's photos → develop → CTA "Save & next station →" → quiet segment tick (S1 stepper: ~22×4px segments + "Station N of N" Inter 600 ~11px #9fb0c8; no ✓ glyphs) → screen swaps to next → last station CTA = "Save to library" → ONE plural celebrate ("2 stations logged. Forever."). Forward-only; header Save = Save & next in stepper mode; bail risks only the current draft; type/ages inherit, editable per station.
9. ☐ **Graceful states** — frames `15a`–`15d`. Mic denied (typing door + 1-tap Settings link) · no speech → retry · AI fail → manual edit · offline → record-now. Never a dead end.

**Cutover (after gate C):** transitional mapping so new cards render in the OLD library UI (title/cover/skills map; steps+cues → description slot) · point entry links at `/log` · retire old wizard components · final merge gate.

## Per-chunk loop (the worker contract)
build → `npx tsc --noEmit` + `npm run build` → screenshot side-by-side vs the frame(s) → /polish (polish-audit) + the chunk's acceptance criteria → fix → report.
Screenshot loop: dev server via the preview tool; export frame at `/dev/frames/<id>`; if the preview pane can't hold the route, fall back to Claude-in-Chrome on River's real Chrome (`next dev -p 3001`; OneDrive file-watching drops the server — restart when blank).

## River gates (the ONLY interrupts)
1. iPhone device test after each group (A/B/C). 2. Migration 017 approval (chunk 5). 3. Final merge.
