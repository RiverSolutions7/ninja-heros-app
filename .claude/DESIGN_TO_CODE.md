# Claude Design → Code Transfer Workflow

## The Rule

**Never implement from a screenshot.** Always get the ground-truth HTML from Claude Design before writing a single line of code.

Screenshots cannot communicate: animation easing curves, exact pixel values, font sizes, z-index stacking, keyframe percentages, transition durations, or component structure.

---

## The Standard Method — Download ZIP

Claude Design has a **"D" (Download) button** in the top-right of every project. This exports all files as a ZIP containing the actual `.html` files for each screen.

**Steps:**
1. Finish and approve the design in Claude Design
2. Click the **D** button (top-right corner) → download the ZIP
3. Extract the ZIP to a local folder (e.g. `C:\Users\river\Downloads\design-export\`)
4. Tell Claude Code: *"Read the HTML at [path] and implement it"*
5. Claude Code reads the exact CSS, keyframes, animation values, and structure — then translates to React

---

## Fallback — Copy HTML Source

If the ZIP download isn't available for a single screen:

1. In Claude Design, click the file tab (e.g. `Voice.html`)
2. Right-click → **View Page Source** (Ctrl+U) → Select All → Copy
3. Paste the HTML into the Claude Code chat: *"Here is the exact HTML from Claude Design. Implement this."*
4. Claude Code reads inline styles and keyframes directly from the source

---

## The Full Workflow Every Time

```
1. Design in Claude Design — iterate via screenshots (fine here)
2. Design is APPROVED by user
3. Click "D" → download ZIP → extract locally
4. Tell Claude Code: "Read [path/to/file.html] and implement it"
5. Claude Code reads source → translates to React → commits
6. Test on device
7. Changes needed? → back to Claude Design → re-export → repeat from step 4
```

---

## Match the export — never substitute a primitive

Getting the exact HTML is step one. Step two: **build it to match, exactly.** Reuse a shared component ONLY where it already matches the design. The moment the design diverges from a primitive, **match the design** (screen-local code) — do NOT round it off to an existing component "for consistency." The only thing that overrides the export is an explicitly-agreed structural anchor (currently just the shared `Chrome` top bar). Full rule set: **"The Fidelity Law"** in the vault `clean/stack.md`.

## Lock it — the `@design-locked` marker

When you implement a screen from a Claude Design export, add a marker comment near the top of the component so the polish-audit treats it as visually locked (and won't later "correct" it back toward a primitive):

```ts
/**
 * @design-locked source="Claude Design export: <file>.html"
 * Built verbatim from the export — the export is the visual source of truth (see The Fidelity Law in stack.md).
 * polish-audit: do not flag divergence from shared primitives as drift; flag only a11y / tap-targets / state / bugs.
 */
```

---

## Anti-Patterns — Never Do These

- ❌ Sharing a screenshot and saying "implement this"
- ❌ Substituting an app primitive for the design's exact element "for consistency"
- ❌ Letting a polish pass collapse a design-locked screen back toward primitives
- ❌ Claude Code guessing CSS values from visual inspection
- ❌ Implementing before the design is approved
- ❌ Treating the screenshot phase and the code phase as the same step
