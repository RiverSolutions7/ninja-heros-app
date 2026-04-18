#!/usr/bin/env bash
# PostToolUse hook — fires polish-audit reminder after any git commit.
# Hook receives the tool invocation JSON on stdin. We only act if the
# command was a git commit; otherwise we exit silently.

INPUT=$(cat)

# Extract the command. Prefer jq when available for robustness; fall
# back to a grep match that handles the common tool_use envelope shape.
if command -v jq >/dev/null 2>&1; then
  CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
else
  CMD=$(printf '%s' "$INPUT" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed -E 's/.*"command"[[:space:]]*:[[:space:]]*"([^"]*)"/\1/')
fi

# Only fire on git-commit-style commands. We want to miss `git log`,
# `git status`, `git show`, etc.
if printf '%s' "$CMD" | grep -qiE '(^|[^[:alnum:]])git[[:space:]]+commit'; then
  # Emit the additionalContext payload that Claude Code injects as a
  # system-reminder into the next turn. This is how we bridge the "a
  # commit happened" event into "please run the polish-audit subagent."
  cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "A git commit just completed. Per the workflow established in .claude/plans/starry-popping-aurora.md, invoke the polish-audit subagent now (Agent tool, subagent_type=\"polish-audit\") with a prompt to review the diff of the latest commit (git show HEAD). Surface the findings inline before continuing. If findings are all clean, acknowledge that briefly."
  }
}
JSON
fi

exit 0
