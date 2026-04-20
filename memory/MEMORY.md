# Ninja H.E.R.O.S. Coach Hub — Design & Workflow Memory

This file is the **authoritative design-system reference** for the Coach Hub. The polish-audit subagent (`.claude/agents/polish-audit.md`) reads this file during every review. When something conflicts between this file and a default convention, this file wins.

The product bar is Apple-quality mobile polish — SaaS-retainer worthy. Coaches pay a monthly fee. The app cannot feel like a prototype.

---

## Design Primitives Registry

Every interactive or visually-distinct element MUST use the canonical primitive below. Hand-rolled alternatives = polish drift.

### Interaction primitives

| Primitive | Path | Use for | Do NOT |
|---|---|---|---|
| `Button` | `app/components/ui/Button.tsx` | Every clickable/tappable CTA. Variants: `primary`, `secondary`, `ghost`, `destructive`. Loading + disabled built in. | Inline `<button className="bg-accent-fire text-white font-heading rounded…">` |
| `Chip` | `app/components/ui/Chip.tsx` | Pills, badges, status labels (Saved / Custom / Game / Station / etc.) | Inline `<span className="px-2 py-0.5 rounded-full text-[10-12px] uppercase">` |
| `BottomSheet` | `app/components/ui/BottomSheet.tsx` | Any slide-up sheet (menu, picker, form). Includes backdrop, drag handle, `role="dialog"`, iOS inertia. | Hand-rolled `fixed inset-x-0 bottom-0 bg-bg-card rounded-t-2xl` sheets |
| `ConfirmSheet` | `app/components/ui/ConfirmSheet.tsx` | Yes/no or delete confirmations. Destructive variant included. | `window.confirm` / `window.alert` / inline confirmation JSX |
| `ChoiceSheet` | `app/components/ui/ChoiceSheet.tsx` | Single-selection from a list (duration, type, category, etc.) | Native `<select>` elements |
| `MenuList` | `app/components/ui/MenuList.tsx` | Icon + label row list inside a `BottomSheet` (kebab menus, context actions) | Inline rows reimplementing icon-gap-label pattern |
| `MediaStrip` + `MediaAddSheet` | `app/components/ui/MediaStrip.tsx`, `app/components/ui/MediaAddSheet.tsx` | Any photo/video capture or display surface | Inline `<input type="file" accept="image/*">` + thumbnail JSX |
| `PhotoLightbox` | `app/components/ui/PhotoLightbox.tsx` | Full-screen photo viewer | Hand-rolled fixed-position image overlays |
| `EmptyState` | `app/components/ui/EmptyState.tsx` | Any "No X yet" empty list/zero-state. Title + body + optional CTA. | One-off centered paragraph blocks |
| `Spinner` | `app/components/ui/Spinner.tsx` | Any loading indicator | Inline `border-2 border-accent-fire border-t-transparent rounded-full animate-spin` copies |
| `Toast` via `useToast` | `app/components/ui/Toast.tsx` | Transient confirmations ("Added to plan", "Saved", etc.) | Hand-rolled floating notification JSX, `setTimeout`-driven inline toasts |

### Domain primitives

| Primitive | Path | Use for |
|---|---|---|
| `SavedPlanRow` | `app/components/plan/SavedPlanRow.tsx` | Every rendering of a saved plan card in lists |
| `ComponentCard` | `app/components/library/ComponentCard.tsx` | Every rendering of a library component row |
| `ComponentArticle` | `app/components/share/ComponentArticle.tsx` | Every full-detail view of a component (share page, detail preview) |
| `ShareMasthead` / `ShareFooter` | `app/components/share/ShareMasthead.tsx`, `ShareFooter.tsx` | Any share-page brand header / footer |

### Gesture primitives

| Hook | Path | Use for |
|---|---|---|
| `useSwipeReveal` | `app/hooks/useSwipeReveal.ts` | Swipe-left to reveal a delete button on list rows (iOS table-view pattern). Export `REVEAL_WIDTH_DEFAULT` to size the delete zone div. |
| `useLongPress` | `app/hooks/useLongPress.ts` | Press-and-hold to open contextual actions (saved-plan rows, future long-press menus). Includes `LONG_PRESS_STYLE` to spread onto target. |
| `useVoiceNote` | `app/hooks/useVoiceNote.ts` | Web Speech API + Claude parse endpoints. Used for coach notes and component auto-fill. |
| `useIsMobile` | `app/hooks/useIsMobile.ts` | Breakpoint hook — don't reimplement `window.matchMedia` inline. |

### Typography utilities

Defined in `app/globals.css`:

| Utility | Expands to | Use for |
|---|---|---|
| `.meta-row` | `flex flex-wrap items-center gap-1.5 text-[10px] font-heading uppercase tracking-wide` | Metadata rows above card titles (status chip · N min · M items · timestamp) |
| `.meta-row .sep` | `text-text-dim/40` | The "·" separator inside a `.meta-row` |
| `.section-label` | `text-[11px] font-heading uppercase tracking-[0.14em] text-text-dim` | Section headings inside forms and settings screens |
| `.card` | `bg-bg-card rounded-2xl border border-bg-border shadow-card` | Elevated card surfaces |

**Do NOT inline these class strings.** Use the utility class.

### Design tokens

Defined in `tailwind.config.ts`. Use Tailwind utilities — never hex literals.

| Token | Value | Use |
|---|---|---|
| `bg-bg-primary` | `#080c1a` | App background (dark navy) |
| `bg-bg-card` | `#141c32` | Card / sheet surface |
| `bg-bg-border` | ~`#1f2a48` | Card / input borders |
| `text-text-primary` | white | Primary text |
| `text-text-dim` | ~`#9aa4bf` | Secondary text, metadata |
| `accent-fire` | `#e84040` | Primary accent / custom items / destructive |
| `accent-green` | `#22c55e` | Saved / Game type / skill-recent |
| `accent-blue` | `#3b82f6` | Station type / equipment |
| `accent-gold` | `#f59e0b` | Legacy warmup (deprecated — avoid for new use) |
| `accent-purple` | `#a855f7` | Difficulty / advanced markers |

### Fonts

- Headings: Russo One — `font-heading` / CSS var `--font-russo`
- Body: Nunito — default / CSS var `--font-nunito`

---

## iOS HIG Quick Reference

Apple's Human Interface Guidelines, distilled to the numbers this app enforces.

### Tap targets

- **Minimum 44×44 px** on all interactive elements. No exceptions.
- Common offender: icon-only buttons with `w-8 h-8` (32px). Bump to `min-w-11 min-h-11` or wrap in a 44px padded button.
- Text links inside paragraphs are exempt (Apple counts the full line as the target), but standalone CTAs are not.

### Animation durations

| Action | Duration | Rationale |
|---|---|---|
| Button / link press feedback | **150–200 ms** | Snappy; avoids feeling laggy |
| Sheet slide up/down | **250–350 ms** | Matches iOS modal presentation |
| Page / tab transitions | **300–400 ms** | Matches iOS navigation controller |
| Long-press trigger | **500 ms** | iOS system default — do not change |
| Gesture recognition window | **200–400 ms** | After first pointermove, the gesture must commit or abandon |
| Toast auto-dismiss | **2500–3500 ms** | Long enough to read, short enough to feel transient |

Durations outside these bands are flagged by polish-audit.

### Interactive state coverage

Every tappable element needs at least ONE pressed-state signal:
- `active:scale-[0.98]` — preferred for buttons
- `active:bg-white/5` — preferred for rows and icon buttons
- `active:opacity-70` — acceptable fallback

Missing pressed-state = soft blocker. Users expect tactile feedback on every tap.

Async CTAs also need:
- `loading` prop wired (Spinner inside button)
- Error state surfaced (toast or inline message)
- Disabled state during pending request

### Gesture thresholds

For any new or modified gesture hook in `app/hooks/`:

| Threshold | Minimum | Rationale |
|---|---|---|
| `CLAIM_DISTANCE` | ≥ 18 px | Below this, accidental finger jitter triggers the gesture |
| Horizontal bias ratio | ≥ 2.5× | Distinguishes horizontal swipe from vertical scroll |
| First-move window | ≤ 600 ms | After this, stale pointer data should not claim |
| Minimum pointermove events before claim | ≥ 2 | Prevents single-frame false positives |
| Long-press delay | 500 ms | iOS standard; already the default in `useLongPress` |
| Movement-cancel radius for long-press | 8–12 px | In `useLongPress` this is `MOVEMENT_CANCEL_PX = 12` |

Values looser than these = blocker (gesture will mis-fire on real devices).

### Pointer event contract

Every gesture hook must handle ALL of:
- `pointerdown` — start tracking
- `pointermove` — update state, possibly claim
- `pointerup` — commit or cancel
- `pointercancel` — clean up (system-interrupted gesture)

Missing `pointercancel` = blocker (leaks timer + state on interrupted gestures).

### Dev-mode instrumentation

Every gesture hook emits guarded logs so inspect.dev has receipts when debugging on the iPhone:

```ts
if (process.env.NODE_ENV === 'development') {
  console.log('[gesture:longpress] event=pointerdown x=%d y=%d delay=%d', e.clientX, e.clientY, delayMs)
}
```

Format: `[gesture:name] event=... key=value key=value`. Human-readable, grepable.

Every state transition should emit a log line. That's how we reproduce remote bugs in one iteration instead of three.

---

## Accessibility Requirements

- Icon-only `<button>` MUST have `aria-label` describing the action. Blocker if missing.
- Form inputs MUST have a `<label>` or `aria-label`. Blocker if missing.
- Custom interactive elements (`onClick` on `<div>`) MUST have `role`, `tabIndex={0}`, AND `onKeyDown` for Enter/Space. Warning if missing any of these.
- Modal sheets MUST have `role="dialog"` and `aria-modal="true"`. `BottomSheet` handles this — flag hand-rolled sheets that don't.
- Color contrast: every text + background pair must meet WCAG AA (4.5:1 for normal text, 3:1 for large text). Check metadata text especially — `text-text-dim` on `bg-bg-card` is near the line.

---

## Commit Conventions

### Message format

```
<type>: <short summary>

<body — optional, wrap at 72 chars>

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat:` (new capability), `fix:` (bug fix), `chore:` (tooling / deps / refactors that don't change behavior), `feat!:` (breaking change).

### Size

- Target ≤ 400 lines changed per commit for behavior changes.
- Refactors can be larger but should be mechanical (e.g., rename, extract, move) — call that out in the subject.
- Squash work-in-progress commits before pushing.

### Co-author trailer

Always include `Co-Authored-By: Claude <noreply@anthropic.com>` when Claude authored. Polish-audit flags missing trailers as a warning.

---

## Workflow Infrastructure (System 2)

The app uses a strict automated quality gate:

1. **Polish-audit subagent** (`.claude/agents/polish-audit.md`) — strict reviewer invoked after every commit via PostToolUse hook, or on-demand via `/polish`.
2. **PostToolUse hook** (`.claude/settings.json` → `.claude/hooks/post-commit-audit.sh`) — detects `git commit` Bash calls and injects a reminder to run polish-audit on `git show HEAD`.
3. **Slash commands** in `.claude/commands/`:
   - `/polish` — one-off audit of current diff
   - `/design-review` — branch-wide audit + manual pass against Claude Design spec
   - `/gesture-test` — audit every hook in `app/hooks/` for threshold values and instrumentation
4. **inspect.dev** (outside the repo, ~$10/mo) — Windows app that gives Safari Web Inspector parity so the user can debug live on the iPhone from the ThinkPad.
5. **Claude Design** (outside the repo) — visual source of truth. Project URL goes in [the section below](#claude-design-project-link) once created.

### Claude Design project link

[Ninja H.E.R.O.S. Coach Hub — Claude Design](https://claude.ai/design/p/fee76c2f-33f2-4cb7-af0e-b9c1818ec888)

---

## Project reference (brief)

- Two-tool system: **Library** (knowledge base of Games + Stations) and **Today's Plan** (class planning + auto-history).
- Types: `app/lib/database.types.ts` — `ComponentType = 'game' | 'station'` (warmup removed April 2026).
- Data: Supabase (Postgres + Storage). No auth (shared coach tool). Photos → `station-photos` bucket. Videos → `station-videos`.
- Queries: `app/lib/queries.ts` (single source of truth for DB access).
- Client: `app/lib/supabase.ts`.
- Migrations: `supabase/migrations/` (latest: `016_remove_warmup.sql`).

Active routes: `/library`, `/library/log-component`, `/library/log-component/[componentId]`, `/program`, `/today`, `/inspire`.

---

## Current polish backlog (short)

Items flagged during manual review that are not yet fixed:

- _(none at time of writing — polish sweep just completed)_

When the polish-audit catches new drift post-commit, append it here until fixed.
