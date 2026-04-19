---
description: Run the polish-audit subagent over the current diff and report findings.
---

Invoke the `polish-audit` subagent now via the Agent tool with `subagent_type="polish-audit"`.

Scope for the subagent:

- Default: review the diff of uncommitted changes (`git diff` + `git diff --cached`). If the working tree is clean, fall back to the most recent commit (`git log -1 -p`).
- If the user supplied arguments to this command (e.g. `/polish app/components/plan`), scope the audit to those paths instead.

Pass these instructions to the subagent:

> Audit the current diff against the polish checklist in your agent definition. Be strict. Surface blockers and warnings with file:line references and one-line remediation suggestions. Use the exact report format specified in your agent definition. Cross-reference `memory/MEMORY.md` (Design Primitives Registry + iOS HIG Quick Reference) as the authoritative source when there's ambiguity.

After the subagent returns, surface its full report to the user verbatim. Do NOT start fixing anything unless the user asks — this is a review command, not an auto-fix command.
