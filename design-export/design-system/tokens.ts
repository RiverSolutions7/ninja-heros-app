// Ignite Coach Hub — the design system, harvested from the shipped @design-locked log flow.
//
// SOURCE OF TRUTH: this file is the machine-readable extraction of the visual language that shipped in
// `app/components/log/` (the certified, device-gated build) and the certified export
// (`design-export/capture/frames/*.html` + `motion-dc.js`). EVERY value here is traceable to shipped
// code or a certified frame — nothing is invented. Where the shipped code diverged from the export
// (e.g. the dock is SOLID lit-navy, not the frame's frosted glass — the freeze rule), the SHIPPED value
// wins and is the one recorded.
//
// RN-COMPATIBLE by construction: numbers are plain numbers (no `px` strings), colors are hex/rgba
// strings, easings are cubic-bezier arg arrays, springs carry their raw {zeta, omega} + sample counts.
// The web build expressed these as inline-style strings; a React Native (or any) target reads the same
// values from here. See `design-system.md` for the human doc (laws, parts inventory, how-to-use).
//
// ⚠ NORMALIZATION: near-duplicate greys/oranges are kept BOTH (never silently merged). The pairs that
// are candidates to unify are listed in design-system.md under "candidates to unify (River's call)".

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// COLOR — named by ROLE, not by appearance.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
export const color = {
  // ── Surfaces: the navy ladder (darkest → lightest lit surface) ──────────────────────────────────
  surface: {
    /** #040710 — near-black. Full-screen photo-viewer backdrop; sheet/confirm scrim base. */
    void: '#040710',
    /** #080c1a — the screen. Capture root, NotesDoc, SortBins, Celebrate base fill. */
    screen: '#080c1a',
    /** #0e1426 — the sunken input well (add-form text field). */
    well: '#0e1426',
    /** #0c1322 — the solid lit-navy dock + the celebrate thumb-slot bg. Anything that ANIMATES. */
    dock: '#0c1322',
    /** #111a30 — a step row lifted while dragging. */
    dragging: '#111a30',
    /** #141c32 — the raised card / bottom sheet / warm callout / confirm dialog / failure card. */
    card: '#141c32',
    /** #212c4c — a SELECTED type pill fill; the add-form "Add" button fill. */
    pillSelected: '#212c4c',
    /** #22304e — a SELECTED age/skill chip fill. */
    chipSelected: '#22304e',
  },

  // ── Borders / rings / hairlines (1px inset rings — never separators except the two noted) ────────
  border: {
    /** #2a3450 — the standard raised-surface border + dim (unselected) chip ring + micro-pill border. */
    raised: '#2a3450',
    /** #3a4d77 — the bright ring on a SELECTED age/skill chip; the inline-edit hairline underline. */
    raisedBright: '#3a4d77',
    /** #3a4666 — the selected type-pill ring + the add-form button ring. */
    pillRing: '#3a4666',
    /** #1b2540 — the one hairline used as a SEPARATOR (PhotoSheet "Sort into stations" row top). */
    divider: '#1b2540',
    /** rgba(255,255,255,0.14) — the dock/menu top-highlight inset ring (the "lit" edge). */
    litInset: 'rgba(255,255,255,0.14)',
    /** rgba(255,255,255,0.12) — the frosted-toast / viewer-chip hairline. */
    glassHair: 'rgba(255,255,255,0.12)',
    /** rgba(255,255,255,0.18) — the sheet grab-handle bar. */
    grabHandle: 'rgba(255,255,255,0.18)',
    /** rgba(255,255,255,0.1) — the SortBins tile inset ring. */
    tileInset: 'rgba(255,255,255,0.1)',
    /** rgba(255,255,255,0.16) — the delete-disc inset ring (TypeAgeSheet ✕). */
    discInset: 'rgba(255,255,255,0.16)',
  },

  // ── Text ladder (brightest → faintest). AA-verified over the navy surfaces. ──────────────────────
  text: {
    /** #ffffff — pure white: titles, Save/Done/Continue, selected chip text. */
    white: '#ffffff',
    /** #e7eefa — the primary reading ink: body, step rows, note text, tile/cover labels. */
    hi: '#e7eefa',
    /** #f2f5fb — the anchored-menu item ink (a hair brighter than hi, on the frosted menu). */
    menu: '#f2f5fb',
    /** #cdd8ea — frosted-toast / undo-lozenge / mic-denied label ink. */
    onGlass: '#cdd8ea',
    /** #c8d4e8 — the 2nd-brightest waveform bar ramp (C3). */
    waveC3: '#c8d4e8',
    /** #9fb0c8 — the mid ink: sublines, skill pills, muted CTAs, the dock label, section body. */
    mid: '#9fb0c8',
    /** #8fa0bd — the ⋯ options glyph; the mid waveform ramp (C2); the photo-stack outline. */
    dim: '#8fa0bd',
    /** #7d8aa3 — the section-header caption ink (TYPE / CURRICULUM / SKILLS). */
    caption: '#7d8aa3',
    /** #7c88a0 — the muted-mic (mic-off) glyph ink. */
    muted: '#7c88a0',
    /** #5b6b86 — the faintest: numerals, "(optional)", settings line, RowChevron, waveform floor (C1). */
    faint: '#5b6b86',
  },

  // ── Accent + semantic hues ───────────────────────────────────────────────────────────────────────
  accent: {
    /** #ff5a1f — THE accent. Used ONCE per screen for the single most-important thing (the mic disc,
     *  eyebrows, step numerals, the primary CTA, selection rings on the sort bin). rgb(255,90,31). */
    fire: '#ff5a1f',
    /** #ff7a2f — a BRIGHTER accent used on the undo-lozenge button + the 15c "Add the steps yourself →"
     *  link. Candidate to unify with `fire` (River's call). rgb(255,122,47). */
    fireBright: '#ff7a2f',
  },
  /** #ff6b6a — danger: the "Delete" row in the anchored menu. rgb(255,107,106). */
  danger: '#ff6b6a',
  /** #ffab7d — the warm "Coach's cues" callout header. rgb(255,171,125). */
  cuesWarm: '#ffab7d',
  /** #2a6bdb — the one BLUE: the inline-edit caret + the authored "Save to library" button fill.
   *  (Kept per the Fidelity Law — the export authored Save blue, not orange. Flagged for River.) */
  actionBlue: '#2a6bdb',

  // ── Menu-item ink states (frosted anchored menu) ─────────────────────────────────────────────────
  menuItem: {
    normal: '#f2f5fb',
    danger: '#ff6b6a',
    /** disabled/greyed row (e.g. "Merge with next" on the last step). */
    disabled: 'rgba(242,245,251,0.35)',
  },

  // ── Frosted glass (STATIC blur only — never animated; only over the photo/hero) ──────────────────
  glass: {
    /** stack-count chip: rgba(12,19,34,0.55) + blur(20). */
    chip: { fill: 'rgba(12,19,34,0.55)', blur: 20 },
    /** toast / whisper / undo lozenge: rgba(12,19,34,0.78) + blur(20). */
    toast: { fill: 'rgba(12,19,34,0.78)', blur: 20 },
    /** anchored context menu: rgba(26,34,56,0.72) + blur(24) saturate(160%). */
    menu: { fill: 'rgba(26,34,56,0.72)', blur: 24, saturate: 1.6 },
    /** the PhotoSheet "Cover" tag SOLID fallback while its tile is dragging (freeze rule). */
    coverTagSolid: 'rgba(12,19,34,0.92)',
    /** viewer "Make cover" chip + close-disc face. */
    viewerChip: 'rgba(255,255,255,0.12)',
    /** the ✕ close disc over a photo (PhotoSheet / SortBins). */
    closeDisc: 'rgba(4,7,16,0.55)',
    closeDiscStrong: 'rgba(4,7,16,0.62)',
  },

  // ── Scrims + gradient washes (all plain rgba — safe to animate opacity, never a backdrop-filter) ─
  scrim: {
    /** the bottom-sheet / delete-confirm scrim. */
    sheet: 'rgba(4,7,16,0.62)',
    /** the discard-confirm scrim (over the screen). */
    confirm: 'rgba(8,12,26,0.72)',
    /** hero bottom scrim: transparent → 0.62 over 130px. */
    heroBottom: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.62) 100%)',
    /** developed-card static base scrim (130px). */
    cardBase: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.62) 100%)',
    /** developed-card DEEP scrim, rig-animated 0→1 opacity (250px). */
    cardDeep: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.55) 42%, rgba(8,12,26,0.88) 100%)',
    /** NotesDoc photo-band fade (110px). */
    bandFade: 'linear-gradient(rgba(8,12,26,0) 0%, rgba(8,12,26,0.9) 100%)',
    /** top light wash on empty / celebrate (320px). */
    topWash: 'linear-gradient(rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
    /** the check-disc inner sheen (celebrate + add tile). */
    discSheen: 'linear-gradient(rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 55%)',
    /** the revise-glow warm tint (fades opacity 1→0 over ~2s). */
    glowTint: 'rgba(255,90,31,0.10)',
  },

  // ── Pill-progress dots (photo carousel) ──────────────────────────────────────────────────────────
  dot: {
    active: 'rgba(255,255,255,0.95)',
    inactive: 'rgba(255,255,255,0.35)',
  },

  // ── Waveform bar ramp (46-bar recording waveform, faint → bright by height) ──────────────────────
  wave: { c1: '#5b6b86', c2: '#8fa0bd', c3: '#c8d4e8', c4: '#e7eefa' },
} as const

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TYPE — Inter only. Each entry is a role: {size, weight, tracking (px), caps?, lineHeight?, italic?}.
// Titles = 800 tight; body = 400; labels/captions = 600 wide caps. Russo One / Nunito are BANNED here.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
export const fontFamily = 'Inter'

export const type = {
  /** 27/800/-0.8 — the biggest headline: celebrate "Logged. Forever.", empty state, Sort title. */
  title27: { size: 27, weight: 800, tracking: -0.8, lineHeight: 1.15 },
  /** 24/800/-0.6 — the developed-card title (glimpse). Plural celebrate headline uses -0.8. */
  cardTitle24: { size: 24, weight: 800, tracking: -0.6 },
  /** 21/800/-0.5 — the NotesDoc (expanded reading) title. */
  cardTitle21: { size: 21, weight: 800, tracking: -0.5 },
  /** 19/800/-0.4 — the PhotoSheet "Photos" sheet header. */
  sheetTitle19: { size: 19, weight: 800, tracking: -0.4 },
  /** 17/700 — confirm-dialog titles (discard / delete). */
  dialogTitle17: { size: 17, weight: 700, tracking: 0 },
  /** 16/700/-0.2 — add-form heading. 16/600 = the sheet "Done" (top-right). */
  heading16: { size: 16, weight: 700, tracking: -0.2 },
  done16: { size: 16, weight: 600, tracking: 0 },
  /** 15/600/-0.1 — the header type/age chip, header "Save", NotesDoc/PhotoSheet "Done". */
  label15: { size: 15, weight: 600, tracking: -0.1 },
  /** 15/600 — a type pill. */
  typePill15: { size: 15, weight: 600, tracking: 0 },
  /** 15/700 — the primary confirm button ("Discard", "Delete"). */
  ctaStrong15: { size: 15, weight: 700, tracking: 0 },
  /** 14.5/400 @1.4 — the editorial step rows (NotesDoc). */
  body14_5: { size: 14.5, weight: 400, tracking: 0, lineHeight: 1.4 },
  /** 14.5/700 — full-width action buttons (Add / Continue / Share / Sort CTA use 600–700). */
  button14_5: { size: 14.5, weight: 700, tracking: 0 },
  share14_5: { size: 14.5, weight: 600, tracking: 0 },
  /** 14/600 — the confirm "cancel/keep" secondary button. */
  buttonSecondary14: { size: 14, weight: 600, tracking: 0 },
  /** 13.5/400 @1.5 — sublines, note/critique text, developed step rows. 13.5/400 italic = the cue. */
  body13_5: { size: 13.5, weight: 400, tracking: 0, lineHeight: 1.5 },
  cue13_5: { size: 13.5, weight: 400, tracking: 0, lineHeight: 1.5, italic: true },
  /** 13.5/700 — the blue "Save to library" button. */
  saveBtn13_5: { size: 13.5, weight: 700, tracking: 0 },
  /** 13.5/700/-0.2 — the celebrate rename field. */
  rename13_5: { size: 13.5, weight: 700, tracking: -0.2 },
  /** 13.5/600 — an age/skill chip; the "Sort into stations" row. */
  chip13_5: { size: 13.5, weight: 600, tracking: 0 },
  /** 13/500 — the "↺ try again" re-record affordance. 13/600 = "+ New type / + Add" doors. */
  label13: { size: 13, weight: 500, tracking: 0 },
  door13: { size: 13, weight: 600, tracking: 0 },
  /** 13/600 — the 15c failure-card lines. */
  failure13: { size: 13, weight: 600, tracking: 0 },
  /** 12.5/400 — frosted-toast / undo-lozenge text. 12.5/600 = the "✎ Edit list" door. */
  toast12_5: { size: 12.5, weight: 400, tracking: 0 },
  editDoor12_5: { size: 12.5, weight: 600, tracking: 0 },
  /** 12/400 — the whisper text ("Multiple setups?"), settings line. 12/700 = whisper "Sort →". */
  micro12: { size: 12, weight: 400, tracking: 0 },
  microStrong12: { size: 12, weight: 700, tracking: 0 },
  /** 12/600 — the stack-count chip; viewer "Make cover" (12.5). */
  count12: { size: 12, weight: 600, tracking: 0 },
  /** 11.5/400 @1.4 — the offline reassurance line. */
  offline11_5: { size: 11.5, weight: 400, tracking: 0, lineHeight: 1.4 },
  /** 11/600 caps @1.5 — section captions (TYPE / CURRICULUM / SKILLS), stepper label, bin label. */
  caption11: { size: 11, weight: 600, tracking: 1.5, caps: true },
  /** 10/700 caps @2.2 — the developed-card / NotesDoc eyebrow ("STATION · AGES 5–7"). */
  eyebrow10: { size: 10, weight: 700, tracking: 2.2, caps: true },
  /** 10/700 caps @1.8 — the "Coach's cues" callout header. */
  cuesLabel10: { size: 10, weight: 700, tracking: 1.8, caps: true },
  /** 10.5/600 — the PhotoSheet "Cover" tag. */
  coverTag10_5: { size: 10.5, weight: 600, tracking: 0 },
  /** 10/600 — the skill micro-pills (glimpse + notes footer). */
  pill10: { size: 10, weight: 600, tracking: 0 },
  /** 9.5/600 caps @1.5 — the celebrate landed-card eyebrow. 9/600 = the plural celebrate card eyebrow. */
  celebEyebrow9_5: { size: 9.5, weight: 600, tracking: 1.5, caps: true },
  celebEyebrow9: { size: 9, weight: 600, tracking: 1.5, caps: true },
  /** 9/600/-0.2 and 12/600/-0.2 — the celebrate/plural card title. */
  celebCardTitle12: { size: 12, weight: 600, tracking: -0.2 },
  /** 22/200 — the HAIRLINE step numeral in the NotesDoc left column (Inter 200). */
  numeralHairline22: { size: 22, weight: 200, tracking: 0, lineHeight: 1 },
} as const

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SPACE — the 4pt grid values actually in use (plus the odd half-steps the frames authored).
// ─────────────────────────────────────────────────────────────────────────────────────────────────
export const space = {
  x0: 0, x2: 2, x3: 3, x4: 4, x5: 5, x6: 6, x7: 7, x8: 8, x9: 9, x10: 10, x11: 11, x12: 12,
  x14: 14, x16: 16, x18: 18, x20: 20, x22: 22, x24: 24, x26: 26, x28: 28, x40: 40, x46: 46,
  /** the screen inset the header/hero rest at from the top of the safe area. */
  screenTop: 46,
  /** the dock's resting bottom gap (also the keyboard-lift baseline). */
  dockBottom: 46,
} as const

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// RADIUS — the full ladder, each verified against shipped code.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
export const radius = {
  /** 34 — the empty-state photo-stack button (68px disc). */
  photoButton: 34,
  /** 33 — the dock (66px min-height, continuous squircle feel). */
  dock: 33,
  /** 28 — the celebrate check disc (56px). */
  checkDisc: 28,
  /** 27 — the record disc (54px capture / mini-dock 46px → 23). */
  disc: 27,
  discMini: 23,
  /** 26 — full-width CTA buttons (52px tall): Add, Share, Continue, Sort, blue Save is 20. */
  cta: 26,
  /** 22 — the type pill. */
  typePill: 22,
  /** 20 — the card / hero band / bottom-sheet top corners / confirm dialog. */
  card: 20,
  /** 19 — the age / skill chip. */
  chip: 19,
  /** 17 — the viewer "Make cover" chip (34px). */
  viewerChip: 17,
  /** 16 — photo tile, sort bin, warm callout, celebrate card row, failure card. */
  tile: 16,
  /** 14 — chip / callout / toast / whisper / lozenge / add-form field / photo-sheet tile. */
  chipSmall: 14,
  /** 13 — the anchored context menu. */
  menu: 13,
  /** 12 — the SortBins 64px source tile. */
  sortTile: 12,
  /** 11 — the ✕ close disc (22px) / the "Cover" tag. */
  closeDisc: 11,
  /** 10 — the celebrate thumb slot / a dragging step row / the undo-lozenge button. */
  thumb: 10,
  /** 9 — the skill micro-pill. */
  microPill: 9,
  /** 3 — pill dots + grab handle. 2 — waveform bar + stepper segment. */
  dot: 3,
  bar: 2,
} as const

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// ELEVATION — the drop-shadow + lit-inset system. Strings kept literal (they are box-shadow values).
// ─────────────────────────────────────────────────────────────────────────────────────────────────
export const elevation = {
  /** the lit-navy dock: a 1px top-highlight ring + a soft drop. THE signature "lit" surface. */
  dock: 'rgba(255,255,255,0.14) 0px 0px 0px 1px inset, rgba(0,0,0,0.45) 0px 14px 30px',
  /** the hero photo band / developed card. */
  hero: 'rgba(0,0,0,0.55) 0px 24px 60px',
  /** a bottom sheet (upward shadow). */
  sheet: 'rgba(0,0,0,0.5) 0px -18px 44px',
  /** the frosted anchored menu. */
  menu: 'rgba(0,0,0,0.5) 0px 12px 32px',
  /** the frosted toast / whisper / lozenge. */
  toast: 'rgba(0,0,0,0.4) 0px 12px 26px',
  /** a photo tile lifted while dragging (PhotoSheet). */
  dragTile: 'rgba(0,0,0,0.6) 0px 18px 34px',
  /** a step row / the SortBins drag overlay lifted while dragging. */
  dragRow: 'rgba(0,0,0,0.55) 0px 14px 30px',
  dragOverlay: 'rgba(0,0,0,0.55) 0px 16px 30px, rgba(255,255,255,0.2) 0px 0px 0px 1px inset',
  /** the 15c failure card. */
  failureCard: 'rgba(0,0,0,0.4) 0px 14px 30px',
  /** the empty-state photo button (inset highlight + drop). */
  photoButton: 'rgba(255,255,255,0.06) 0px 1px 0px inset, rgba(0,0,0,0.4) 0px 14px 28px',
  /** an inset ring for a selected/lit small surface (check disc, add-form button). */
  ringRaised: 'rgb(42,52,80) 0px 0px 0px 1px inset',
  ringPill: 'rgb(58,70,102) 0px 0px 0px 1px inset',
  ringChipBright: 'rgb(58,77,119) 0px 0px 0px 1px inset',
} as const

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// MOTION — every named beat with exact numbers. Easings as named cubic-bezier arg arrays; springs as
// {zeta, omega, ...}. All values copied from motion-dc.js / the shipped ports (never re-derived).
// ─────────────────────────────────────────────────────────────────────────────────────────────────
export const easing = {
  /** the default ease/ease-out/ease-in — kept as names for RN mapping. */
  ease: 'ease',
  easeOut: 'ease-out',
  easeIn: 'ease-in',
  /** [0.22,0.61,0.36,1] — the SETTLE curve (develop cascade, sheet snap-back, glow resolve, hero swipe). */
  settle: [0.22, 0.61, 0.36, 1],
  /** [0.34,1.2,0.64,1] — the bar-BLOOM overshoot (waveform beat-in). */
  bloom: [0.34, 1.2, 0.64, 1],
  /** [0.55,0,0.85,0.4] — the bar-SWEEP out (waveform beat-out). */
  sweepOut: [0.55, 0, 0.85, 0.4],
  /** [0.34,1.4,0.64,1] — the celebrate CHECK pop (scale overshoot). */
  checkPop: [0.34, 1.4, 0.64, 1],
  /** [0.34,1.5,0.64,1] — the anchored-menu scale-in (whisper of overshoot). */
  menuPop: [0.34, 1.5, 0.64, 1],
  /** [0.3,0.8,0.3,1] — the keyboard-lift dock translate. */
  keyboardLift: [0.3, 0.8, 0.3, 1],
  /** [0.4,0,1,1] — the bottom-sheet slide-DOWN exit. */
  sheetExit: [0.4, 0, 1, 1],
} as const

export const motion = {
  /** RECORDING RIG (waveform dock) — beat-in bloom + beat-out sweep + crossfade. */
  recordingRig: {
    bloom: 190, // ms per bar bloom
    stagger: 28, // ms between bars (nearest-button-first in, farthest-first out)
    bounce: 0, // overshoot amount on the bar scaleY (baked to 0)
    xfade: 280, // ms glyph/placeholder crossfade (also the disc mic↔↑ reconcile)
    beatOutBarDur: 190 * 0.7, // out bars run 0.7× the bloom
    timerFadeIn: 160,
    timerFadeOut: 140,
    easingBloom: easing.bloom,
    easingSweepOut: easing.sweepOut,
    // live waveform drive
    waveStepMs: 60, // ms per one-bar leftward history scroll
    waveGain: 3.0,
    waveFloor: 0.34, // scaleY on silence
  },

  /** DEVELOP CASCADE (photo → structured card reveal). */
  developCascade: {
    total: 940, // full reveal window
    stagger: 105, // ms between the 6 content elements
    settle: 8, // px upward settle distance
    scrim: 1, // deep-scrim target opacity
    scrimShare: 0.4, // scrim deepens over total*0.4
    elementDurShare: 0.55, // each element resolves over total*0.55, delayed total*0.25 + i*stagger
    easing: easing.settle,
    reducedMs: 250, // reduced-motion crossfade
  },

  /** SAVE FLIGHT (developed card grows/FLIPs into the celebrate thumb slot). */
  saveFlight: {
    durationMs: 390,
    spring: { zeta: 0.591, omega: 6.6 }, // damped spring, sampled to keyframes
    samples: 32, // (33 keyframes) — the ported build uses 32 steps
    startBox: { left: 8, top: 92, w: 374, h: 374, r: 20 },
    endRadius: 10, // lands at the 96×64 thumb slot
    shadowFrom: { oy: 24, bl: 60, a: 0.55 },
    shadowTo: { oy: 4, bl: 10, a: 0 },
    chromeFadeMs: 150, // header · dots · dock · overlay fade together
    reducedMs: 300,
  },

  /** CELEBRATE beats (fire after the flight lands). */
  celebrate: {
    bg: { durationMs: 320, delayMs: 80 },
    wrapper: { durationMs: 260, delayMs: 120 },
    innerRise: { durationMs: 420, delayMs: 120, fromY: 14, easing: easing.settle },
    check: { durationMs: 420, delayMs: 200, from: 0.5, overshoot: 1.08, easing: easing.checkPop },
    reduced: { bg: { durationMs: 220, delayMs: 120 }, wrapper: { durationMs: 240, delayMs: 140 } },
  },

  /** SHEET SETTLE (TypeAge / Photo / Skills bottom sheets — the D2 spring). */
  sheetSettle: {
    inMs: 460,
    samples: 30,
    spring: { zeta: 0.72, omega: 9 }, // ~3.8% overshoot, soft landing
    scrimInMs: 240,
    outMs: 260, // slide-down exit
    scrimOutMs: 220,
    exitEasing: easing.sheetExit,
    snapBackMs: 200, // under-threshold swipe snap-back
    swipeDismissPx: 80, // drag past this → dismiss
    reducedMs: 200,
  },

  /** MENU POP (anchored context menu scale-in from the ⋯). */
  menuPop: {
    durationMs: 150,
    from: 0.82,
    overshoot: 1.02,
    origin: 'right top',
    easing: easing.menuPop,
    reducedMs: 120, // reduced-motion crossfade
  },

  /** the once-per-flow crossfades / fades (all opacity, never over a blur). */
  crossfade: 280, // disc face reconcile (mic ↔ ↑), the dock xfade
  fadeNotesArrival: 240, // NotesDoc arrival (unauthored) — settle language
  fadeNotesArrivalReduced: 200,
  fadeWhisper: 220, // whisper lozenge fade
  fadeWhisperExit: 260,
  fadeViewer: 200, // photo viewer open/close crossfade
  viewerSwipeMs: 260, // strip settle
  viewerZoomMs: 200,

  /** GLOW (revise resolve — the changed rows tint warm then fade). */
  glow: {
    tintMs: 2000, // opacity 1 → hold 0.25 → 0
    rowResolveMs: 520, // opacity 0.5→1 + translateY 6→0
    easing: easing.settle,
  },

  /** UNDO LOZENGE lifetime. */
  undoLozenge: { lifetimeMs: 6000, fadeMs: 220, exitMs: 260 },

  /** NO-SPEECH toast lifetime (mirrors the whisper). */
  noSpeechToastMs: 4500,

  /** keyboard-lift dock translate. */
  keyboardLift: { durationMs: 220, easing: easing.keyboardLift },

  /** DRAG POSES (dnd overlays). */
  dragPose: {
    photoTile: { rotateDeg: 2.5, scale: 1.045 },
    sortOverlay: { rotateDeg: -6, scale: 1.14 },
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// HIT — target sizing + hit-slop conventions.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
export const hit = {
  /** 44 — the iOS minimum. EVERY tap target is padded (invisible hit-slop) to at least 44×44, even when
   *  the visible glyph/text is smaller — negative margins cancel the padding so layout never shifts. */
  min: 44,
  /** the record disc footprint (visible): 54 capture, 46 mini-dock. */
  disc: 54,
  discMini: 46,
  /** the dock min-height: 66 capture, 54 mini-dock. */
  dock: 66,
  dockMini: 54,
  /** dnd activation: mouse 8px distance, touch 200–220ms long-press (distinguishes drag from scroll). */
  dragMouseDistance: 8,
  dragTouchDelayMs: 200,
  dragTouchDelayRowsMs: 220,
} as const

export const tokens = { color, fontFamily, type, space, radius, elevation, easing, motion, hit } as const
export default tokens
