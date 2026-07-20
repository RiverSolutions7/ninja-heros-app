# Ignite Coach Hub — Design System

*The shipped app's visual language, named. Harvested from the certified, device-gated log flow
(`app/components/log/`) and the certified export (`design-export/capture/frames/*.html` + `motion-dc.js`).
This is the foundation every future iPhone-app screen builds from — parts before screens, tokens before
raw values.*

**Machine file:** [`tokens.ts`](./tokens.ts) (RN-compatible plain TS) · mirror [`tokens.json`](./tokens.json).
**Every value here is traceable** to shipped code or a certified frame — nothing is invented. Where the
shipped code diverged from the export (the dock is solid lit-navy, not the frame's frosted glass — the
freeze rule), the **shipped value wins** (it survived River's device gates).

---

## ① Foundations

### Color — the navy room, one warm light
A dark navy room lit from a single warm orange. Named by **role**, never by appearance.

**Surfaces (the navy ladder, darkest → lightest lit):**
| Token | Hex | Role |
|---|---|---|
| `surface.void` | `#040710` | near-black — photo-viewer backdrop, sheet/confirm scrim base |
| `surface.screen` | `#080c1a` | the screen (every root) |
| `surface.well` | `#0e1426` | the sunken input well (add-form field) |
| `surface.dock` | `#0c1322` | the solid lit-navy **dock** + celebrate thumb-slot — anything that animates |
| `surface.dragging` | `#111a30` | a step row lifted mid-drag |
| `surface.card` | `#141c32` | the raised card / bottom sheet / warm callout / dialog / failure card |
| `surface.pillSelected` | `#212c4c` | a selected type-pill fill + the add-form button fill |
| `surface.chipSelected` | `#22304e` | a selected age/skill chip fill |

**Text ladder (bright → faint):** `#ffffff` (titles/Save/Done) · `#e7eefa` `text.hi` (reading ink) ·
`#f2f5fb` `text.menu` (menu items) · `#cdd8ea` `text.onGlass` (toast/lozenge) · `#9fb0c8` `text.mid`
(sublines, pills, CTAs, dock label) · `#8fa0bd` `text.dim` (⋯ glyph) · `#7d8aa3` `text.caption`
(section captions) · `#7c88a0` `text.muted` (mic-off glyph) · `#5b6b86` `text.faint` (numerals,
"(optional)", floor).

**Accent + semantics:** `accent.fire #ff5a1f` (THE accent — used once per screen) · `accent.fireBright
#ff7a2f` (undo button / 15c link) · `danger #ff6b6a` (menu Delete) · `cuesWarm #ffab7d` (Coach's cues
header) · `actionBlue #2a6bdb` (inline-edit caret + the authored "Save to library" button).

**Borders/rings** are 1px **inset** rings (the "lit" edge), not separators: `border.raised #2a3450`
(standard + dim chip ring) · `border.raisedBright #3a4d77` (selected chip ring + edit underline) ·
`border.pillRing #3a4666` (selected type pill) · `border.litInset rgba(255,255,255,0.14)` (dock/menu
top highlight). The **one** hairline used as a separator: `border.divider #1b2540`.

**Glass** (frosted, STATIC blur only, only over the photo): chip `rgba(12,19,34,0.55)`+blur20 · toast
`rgba(12,19,34,0.78)`+blur20 · menu `rgba(26,34,56,0.72)`+blur24 saturate160%.

**Scrims/washes** are all plain rgba gradients (safe to animate opacity, never a backdrop-filter):
hero-bottom `→0.62`, card-deep `→0.88`, band-fade `→0.9`, top-wash white `0.05→0`, glow-tint
`rgba(255,90,31,0.10)`.

### Type — Inter only
Titles **800** with tight tracking; body **400**; labels/captions **600** wide caps. **Russo One and
Nunito are banned in this flow.** The scale (role → size/weight/tracking):

`title27` (27/800/−0.8, headlines) · `cardTitle24` (24/800/−0.6, glimpse title) · `cardTitle21`
(21/800/−0.5, notes title) · `sheetTitle19` (19/800/−0.4) · `dialogTitle17` (17/700) · `heading16`/`done16`
(16/700−0.2 · 16/600) · `label15` (15/600/−0.1, header chip + Save) · `body14_5` (14.5/400 @1.4, step rows)
· `button14_5` (14.5/700, CTAs) · `body13_5` (13.5/400 @1.5, sublines/note) · `cue13_5` (13.5/400 italic)
· `saveBtn13_5` (13.5/700, blue Save) · `chip13_5` (13.5/600, age/skill chip) · `toast12_5` (12.5/400) ·
`micro12` (12/400, whisper) · `count12` (12/600, stack chip) · `offline11_5` (11.5/400) · `caption11`
(11/600 caps @1.5, section headers) · `eyebrow10` (10/700 caps @2.2) · `cuesLabel10` (10/700 caps @1.8) ·
`pill10` (10/600, skill micro-pills) · `numeralHairline22` (**22/200**, the hairline step numeral).

### Space — 4pt grid
`0,2,3,4,5,6,7,8,9,10,11,12,14,16,18,20,22,24,26,28,40,46`. Screen top inset **46**; dock resting bottom
**46** (also the keyboard-lift baseline).

### Radius — the ladder
`34` photo-button · `33` **dock** · `28` check-disc · `27` **disc** (mini 23) · `26` **cta** · `22`
type-pill · `20` **card/hero/sheet-top/dialog** · `19` chip · `17` viewer-chip · `16` **tile**/bin/callout
· `14` **chip/callout/toast/lozenge/field** · `13` **menu** · `12` sort-tile · `11` close-disc/cover-tag ·
`10` thumb/drag-row/undo-button · `9` micro-pill · `3` dot/handle · `2` bar/segment.

### Elevation — drop + lit inset
`elevation.dock` (`rgba(255,255,255,0.14) …inset, rgba(0,0,0,0.45) 0 14px 30px`) is the signature "lit"
surface. Then `hero` (0 24px 60px @0.55), `sheet` (0 −18px 44px), `menu`, `toast`, drag shadows.

### Motion — named beats (exact)
`recordingRig {bloom190, stagger28, bounce0, xfade280}` · `developCascade {940, 105, 8, scrim1}` ·
`saveFlight {390ms, ζ0.591 ωn6.6, 32 samples, r20→10, shadow 24/60/0.55→4/10/0}` · `sheetSettle {460ms,
ζ0.72 ωn9, 30 samples, scrimIn240, out260}` · `menuPop {150ms, 0.82→1.02→1, origin right-top}` ·
`celebrate {bg320@80, wrap260@120, innerRise420@120 from14, check420@200 pop}` · `crossfade 280` ·
`glow {tint2000, rowResolve520}` · `undoLozenge {6000, fade220}` · fades `200/240/260`.
Easings: `settle [0.22,0.61,0.36,1]` · `bloom [0.34,1.2,0.64,1]` · `sweepOut [0.55,0,0.85,0.4]` ·
`checkPop [0.34,1.4,0.64,1]` · `menuPop [0.34,1.5,0.64,1]` · `keyboardLift [0.3,0.8,0.3,1]` ·
`sheetExit [0.4,0,1,1]`.

### Hit — 44 minimum
Every tap target is padded to **≥44×44** with invisible hit-slop (negative margins cancel the padding so
layout never shifts). Discs: 54 capture / 46 mini. Docks: 66 / 54. Drag activation: mouse 8px, touch
200–220ms long-press (distinguishes drag from scroll).

---

## ② THE LAWS

1. **Accent once.** `#ff5a1f` marks the single most-important thing on a screen (the mic disc, the
   eyebrow, a step numeral, the primary CTA, a live selection ring). Never a field of orange.
2. **Solid navy for anything that animates; frosted only for STATIC chrome over the photo.** The dock,
   sheets, cards — anything whose geometry moves — is solid lit-navy. Glass (blur) is reserved for
   chrome floating over the photo that does NOT move (the stack chip, the whisper, toasts, the anchored
   menu while open).
3. **Never animate a blur.** No `backdrop-filter` in any keyframe (the parked freeze's root cause). A
   moving frosted element stalls the iOS raster compositor. Where the export authored a frosted element
   that has to move (the dock, the "Cover" tag on a dragged tile), it ships **solid**.
4. **Reduced motion = crossfade.** Every rig degrades to a plain opacity crossfade (the motion script
   ships each fallback; ~200–300ms).
5. **One save visible.** The header "Save" owns the pre-develop finish and **disappears** the moment a
   card develops; "Save to library" (in the develop dock) owns it from then on. Never two Saves at once.
6. **44px minimum**, VoiceOver labels, AA contrast.
7. **Text actions carry no container.** Secondary actions are bare text (Done, Review & edit ›, ✎ Edit
   list, try again, + New type) — no button chrome. Containers are for the primary CTA only.
8. **Photos are shown whole.** The hero is a natural-band (clamped 16:9 ↔ 4:5, never cropped); tiles use
   a clamped aspect box so `object-fit:cover` is a no-op; the full-screen viewer is `contain` on black.
9. **Progressive disclosure.** Default surfaces are the minimal picking/reading state; the destructive
   and additive controls (✕ delete discs, "+ add" forms) hide behind an "✎ Edit list" door. Structuring
   is opt-in (the raw note is the default; the ↑ disc is the door).

---

## ③ The PARTS inventory

Every reusable piece, its tokens, its states, and when to use it. (Source file in parentheses.)

### The dock (`IdleDock.tsx`, rig in `recordingRig.tsx`)
The bottom **voice-hero dock**: one 66px solid lit-navy pill (`surface.dock`, `radius.dock 33`,
`elevation.dock`). Left = the typing-door label / note; right = the **record disc** (54px, `radius.disc
27`, `accent.fire`). ONE disc that tells a continuous story across three faces:
- **mic** (idle, no note) → **✓** (recording, the flat Continuity check) → **↑** (a note exists, spoken
  or typed → tap = structure). Faces crossfade at `motion.crossfade 280`.
- While typing with empty text the ↑ rides **dimmed 0.4 + dead**; it brightens to full the instant text
  exists. While structuring the disc dims 0.55 + freezes; the label slot carries "Structuring…".
- Graceful faces: mic-off = grey disc `#3a4358` + muted-mic glyph + "Mic's off…" label + raised dock.
- **Use:** the capture screen's primary input. The keyboard lifts it flush via `useKeyboardLift`.

### The waveform (`recordingRig.tsx`)
46 center-mirrored bars, 3px wide / 2px gap, heights baked from frame 8c, ramped faint→bright
(`wave.c1..c4`). Transform-only scaleY drive (rAF only while recording). Beat-in blooms nearest-button
first; beat-out sweeps farthest-first. **Use:** the recording state of any record dock.

### Pill-progress dots (`Capture.tsx`)
Photo-carousel position: active = 14×5 white pill (`dot.active`), inactive = 5px (`dot.inactive`),
`radius.dot 3`, gap 5. **Use:** anywhere multiple photos are browsed (hero, viewer).

### Type / curriculum / skill chips (`TypeAgeSheet.tsx`, `SkillsSheet.tsx`)
- **Type pill:** single-select (`role=radio`), `radius.typePill 22`, selected = `pillSelected` fill +
  `pillRing` inset + white text; unselected = transparent + `text.mid`.
- **Age/skill chip:** multi-select (`role=checkbox`, **no ✓ marks**), `radius.chip 19`, selected =
  `chipSelected` fill + `raisedBright` ring + white; unselected = `raised` dim ring + `text.mid`.
- **Use:** picking type/curriculum/skills. Chips are the multi-select language; pills the single-select.

### Bottom sheets + Edit-list mode (`TypeAgeSheet`, `PhotoSheet`, `SkillsSheet`)
Solid `surface.card` panel, top corners `radius.card 20`, `elevation.sheet`, grab handle (38×5), scrim
`scrim.sheet`. Arrival = `motion.sheetSettle` (D2 spring); swipe-down or scrim/Esc dismisses (commits).
"Done" is bare white text top-right. **Edit-list mode** (`TypeAgeSheet`): a bottom-center "✎ Edit list"
door reveals the ✕ delete discs + the "+ add" mini-forms; default sheet is pure picking (law 9). The
add-form is a labeled well (`surface.well`, `radius.chipSmall 14`) → full-width "Add" button
(`surface.pillSelected` + `pillRing`). **Use:** any modal picker.

### The anchored frosted menu (`NotesDoc.tsx` → AnchoredMenu)
A per-row ⋯ context menu: frosted `glass.menu` (STATIC blur), `radius.menu 13`, `elevation.menu`, 44px
text-only rows. Scales in from the ⋯ (`motion.menuPop`, origin right-top). Portaled to body, position
fixed. Rows: normal `menu.normal`, danger `menu.danger`, disabled `menu.disabled`. **Use:** contextual
row actions (Merge/Delete on a step; Delete on the cues). The one frosted surface that "moves" — allowed
because only its transform/opacity animate, never the blur.

### GracefulToast (`GracefulToast.tsx`)
Frosted `glass.toast` chip, `radius.chipSmall 14`, centered bottom:120, `text.onGlass`. `role=alert`
(errors) or `role=status`. **Use:** transient reassurance/errors (no-speech, save-failure). Mount-in,
mount-out — nothing animates over it.

### UndoLozenge (`UndoLozenge.tsx`)
The toast surface + a real "Undo" button (`accent.fireBright`) split by a hairline. Auto-fades ~6s
(`motion.undoLozenge`); re-keyed so the newest replaces the last. **Use:** an undoable action (revise,
delete). Message-only variant (no button) for "No changes made".

### WhisperLozenge (`WhisperLozenge.tsx`)
Frosted "Multiple setups? **Sort →**" pill above the dock; fades ~4s. **Use:** the once-per-capture nudge
at the 3rd photo toward multi-station sorting.

### The editorial doc + ghost row (`NotesDoc.tsx`)
The expanded reading/editing surface: 236px cropped photo band → eyebrow → title → **editorial step
rows** (a 32px left column of **hairline Inter-200 22px numerals** `text.faint`, `body14_5` text) → the
warm "Coach's cues" callout (`surface.card`, `radius.chipSmall 14`, `cuesWarm` header) → the skills
micro-pill footer. Rows are tap-to-edit (inline textarea, `raisedBright` underline, `actionBlue` caret),
long-press-reorder (dnd-kit), each with a ⋯ menu. A cue-less card shows a ghost "Add a coaching cue…"
row. **Use:** the deep edit of a developed card.

### The mini-dock (`MiniDock.tsx`)
The dock **scaled down** to 54px / 46px disc / `radius.discMini 23` for the NotesDoc critique input —
same solid navy, same waveform + disc family, driven by the shared rig. The ↑ **applies** the critique
(→ revise) instead of structuring. **Use:** the AI critique loop inside the notes doc.

### Card rows — the developed card (`DevelopedCard.tsx`)
The glimpse: an absolutely-positioned photo card (`radius.card 20`, `elevation.hero`) with a static base
scrim + a rig-animated deep scrim, over which the eyebrow (`eyebrow10` accent) → title (`cardTitle24`) →
2 step rows (accent numerals) → "Review & edit › · ✦ Critique" row → skill micro-pills cascade in
(`motion.developCascade`). **Use:** the post-structure preview; also the save-flight star.

### The celebrate (`Celebrate.tsx`)
The "Logged. Forever." finish: a 56px check disc (`radius.checkDisc 28`, sheen), headline `title27`,
subline, the landed card row (96×64 thumb slot, tap title to rename), Share + Continue CTAs
(`radius.cta 26`). Plural variant (`13b`): "N stations logged. Forever." + a stacked card per station.
Arrives via the save-flight morph landing in the thumb slot. **Use:** the save completion screen.

### PhotoViewer (`PhotoViewer.tsx`)
Full-screen `contain`-on-black viewer: 44px ✕ top-left, D2 dots bottom, a quiet "Make cover" chip
(`glass.viewerChip`, `radius.viewerChip 17`). Swipe/pinch/double-tap gestures; 200ms crossfade open/close.
**Use:** tap the hero/card photo to see any angle whole.

### Stepper segments (`Capture.tsx` → StepperLine)
Multi-station progress: 22×4 segments (`radius.bar 2`) — current `text.hi`, done `text.faint`, pending
`#2d3a5a` — + "Station N of N" (`caption11`). No ✓ glyphs. **Use:** a multi-station run header.

### SortBins (`SortBins.tsx`)
Two labeled bins (min-h 296, `radius.tile 16`, `surface.card`, `raised` border → `accent.fire` on
hover-over) + a persistent 64px source-tile palette (assigned tiles dim to 0.4, multi-membership). CTA
enabled only on a complete 2-way split. **Use:** splitting one photo set into separate stations.

### The ✦ chip / stack-count chip (`Capture.tsx`, `DevelopedCard.tsx`)
The frosted stack chip (bottom-left of the hero, `glass.chip`, `radius.chipSmall 14`) opens the
PhotoSheet: reads "+ photo" at exactly 1 photo, a fanned count at 2+. The "✦ Critique" text-chip (accent
✦ + muted "Critique") opens the notes doc focused on the critique input. **Use:** photo management entry;
the AI-critique door.

---

## ④ Voice & copy — coach-warm, never corporate

Warm, direct, a little proud on the coach's behalf. Actual shipped strings:
- Empty: **"First, the course."** / "Snap the station as the kids will see it — or just describe it with
  your voice below."
- Typing door: **"Add a note… (optional)"** ("(optional)" in `text.faint`).
- Celebrate: **"Logged. Forever."** / "{title} is in your library." · plural **"2 stations logged.
  Forever."**
- Whisper: **"Multiple setups? Sort →"**
- Graceful (never a dead end): mic-off **"Mic's off — tap here to type instead"** / "Turn on the mic in
  Settings ›" · no-speech **"Didn't catch that — try again, or tap the note to type."** · offline **"No
  connection — your recording is saved; it'll process when you're back online."** · save-fail **"Couldn't
  save — your card is safe. Try again."** · develop-fail **"Couldn't auto-fill this one." / "Add the
  steps yourself →"**
- Confirms: **"Discard this draft?"** / "Your note and the structured card won't be saved." · delete a
  type: "Cards already using it keep their label."
- Structuring status: **"Structuring…"** / revise: **"Revising…"** / "Tell it what to change…"
- Section captions are single words, caps, wide: **TYPE · CURRICULUM · SKILLS · COACH'S CUES**.

Rules: contractions always; the coach's words are never lost (a failed AI path preserves the raw note);
errors reassure + point at the retry; never a modal dead end.

---

## ⑤ How to use this in RN

1. **Import tokens, never raw values.** `import tokens from '@/design-export/design-system/tokens'` →
   `tokens.color.accent.fire`, `tokens.radius.dock`, `tokens.motion.saveFlight`. If you're typing a hex
   or a magic number into a screen, stop — it belongs in `tokens.ts` first.
2. **Parts before screens.** Build the dock, the chip, the sheet, the card row as reusable primitives
   from this inventory; compose screens from parts. A screen that re-implements a chip has already drifted.
3. **Obey the laws** (§②) — they are what make the surfaces read as one system: accent once, solid for
   motion, never animate a blur, crossfade on reduced motion, one save, 44px, bare-text actions, whole
   photos, progressive disclosure.
4. **Motion is data.** The beats in `tokens.motion` are the certified springs/timings — sample them, don't
   re-derive. Easings are cubic-bezier arg arrays ready for Reanimated / `Easing.bezier`.
5. **Colors are role tokens.** When you need a new surface, place it on the navy ladder by role; when you
   need a new grey, check the text ladder before adding a step (and see the unify candidates below).

---

## ⚠ Candidates to unify (River's call — kept BOTH, never merged silently)

The harvest found these near-duplicate pairs used slightly inconsistently across the shipped code. They
are recorded as distinct tokens; unify only on River's say-so.

1. **Accent orange: `#ff5a1f` (fire) vs `#ff7a2f` (fireBright).** The pinned accent is `#ff5a1f`
   everywhere — except the UndoLozenge "Undo" button and the 15c "Add the steps yourself →" link, which
   use the brighter `#ff7a2f`. Likely wants to be one accent.
2. **Muted greys 1 step apart: `#7c88a0` (muted-mic glyph) vs `#7d8aa3` (section captions).**
   Effectively the same value playing two "caption/muted" roles.
3. **`#8fa0bd` (text.dim) — the ⋯ glyph / photo-stack outline / waveform C2** sits between `text.mid
   #9fb0c8` and `text.onGlass #cdd8ea`; it's a 6th grey outside the nominal 5-step ladder. Consider
   folding the ⋯ glyph onto `text.mid`.
4. **On-glass text: `#cdd8ea` (toast/lozenge) vs `#c8d4e8` (waveform C3)** — one step apart, different
   roles (chrome text vs a waveform ramp stop); probably fine to leave, listed for completeness.
5. **Close-disc scrim: `rgba(4,7,16,0.55)` (PhotoSheet) vs `rgba(4,7,16,0.62)` (SortBins/confirm).**
   Two opacities of the same near-black over a photo.

## Deliberate divergences from the export (shipped code wins — do NOT "fix")

- The **dock** and every animatable surface ship **solid** `#0c1322`, though the export authored them
  frosted — the freeze rule (law 3).
- The **"Save to library"** button is authored **blue** `#2a6bdb`, not the orange accent — kept per the
  Fidelity Law (flagged for River, never changed unilaterally).
- Several pieces are **unauthored** (no frame drew them) and were built in the token language, flagged
  for River's eyeball: the ↑ disc glyph, the ✦ Critique chip, the PhotoViewer, the mini-dock, the
  develop/notes arrival motions, the graceful-state copy. They are recorded here as the shipped truth.
