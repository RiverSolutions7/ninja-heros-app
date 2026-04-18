---
description: Comprehensive design review — polish-audit sweep plus a manual visual/interaction pass.
---

Run a two-pass design review:

### Pass 1 — automated polish audit

Invoke the `polish-audit` subagent via the Agent tool with `subagent_type="polish-audit"` against the full current branch diff vs. `main` (not just the most recent commit). Prompt it:

> Audit the full diff of this branch against `main` (`git diff main...HEAD`) for polish regressions. Use your standard report format. Focus extra attention on:
> - Design-primitive drift (any hand-rolled JSX that reimplements `Button`, `Chip`, `BottomSheet`, `ConfirmSheet`, `ChoiceSheet`, `MenuList`, etc.)
> - Typography that should be `.meta-row` or `.section-label` utilities
> - Missing `:active` feedback on interactive elements

Relay the subagent's report verbatim.

### Pass 2 — manual design-system pass

After the subagent report, do a second manual pass yourself against the Claude Design spec if one is linked in `memory/MEMORY.md`. Walk the changed files and answer:

1. **Visual rhythm.** Do spacings (padding, gaps, margins) match the rest of the app's rhythm (4 / 8 / 12 / 16 / 24 px scale)?
2. **Color token usage.** Are all accent colors coming from the Tailwind theme (`accent-fire`, `accent-green`, `accent-blue`, `accent-gold`, `accent-purple`) and not hex literals?
3. **State richness.** Does every interactive element have hover / active / focus / disabled / loading / error coverage where applicable?
4. **Gesture reliability.** If the change adds or modifies gesture-handling hooks, are the thresholds within iOS HIG conventions (see MEMORY.md HIG Quick Reference)?
5. **Motion consistency.** Do transitions use the project's standard duration bands (150–200 ms UI feedback, 250–350 ms sheet/sidebar, 300–400 ms page)?

Produce a short "Manual findings" section after the subagent report with any items the automated pass wouldn't catch.

### Summary

Finish with a one-paragraph verdict: ship-ready, needs fixes (list them), or significant drift (recommend splitting work).

Do NOT auto-fix anything — this is a review command.
