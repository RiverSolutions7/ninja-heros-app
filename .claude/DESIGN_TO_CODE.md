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

## Anti-Patterns — Never Do These

- ❌ Sharing a screenshot and saying "implement this"
- ❌ Claude Code guessing CSS values from visual inspection
- ❌ Implementing before the design is approved
- ❌ Treating the screenshot phase and the code phase as the same step
