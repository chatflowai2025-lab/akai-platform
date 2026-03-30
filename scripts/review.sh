#!/bin/bash
# ============================================================
# AKAI Code Review Agent — Claude-powered pre-push review
# Adapted from gstack /review pattern
#
# Usage: bash scripts/review.sh [base-branch]
#   base-branch defaults to "main"
#
# Exit 0 = clean, Exit 1 = issues found (blocks push)
# ============================================================
set -euo pipefail

BASE_BRANCH="${1:-main}"
ANTHROPIC_KEY="REMOVED_FROM_HISTORY"

# ── Get the diff ──────────────────────────────────────────────────────────────
# Try diff against main first; fall back to HEAD~1 if main is same commit
if git show-ref --verify --quiet refs/heads/"$BASE_BRANCH" || git show-ref --verify --quiet refs/remotes/origin/"$BASE_BRANCH"; then
  DIFF=$(git diff origin/"$BASE_BRANCH"...HEAD 2>/dev/null || git diff HEAD~1 2>/dev/null || echo "")
else
  DIFF=$(git diff HEAD~1 2>/dev/null || echo "")
fi

if [ -z "$DIFF" ]; then
  echo "ℹ️  No diff found vs $BASE_BRANCH — nothing to review"
  exit 0
fi

# Truncate to 30KB to stay inside Claude's request limits
DIFF_TRUNCATED=$(echo "$DIFF" | head -c 30000)
TRUNCATED_MSG=""
if [ ${#DIFF} -gt 30000 ]; then
  TRUNCATED_MSG="(diff truncated to 30KB for review — full diff is ${#DIFF} bytes)"
fi

echo "▶ Code review pass... (diff: $(echo "$DIFF" | wc -l) lines)"
[ -n "$TRUNCATED_MSG" ] && echo "  ⚠️  $TRUNCATED_MSG"

# ── AGENTS.md RCA summary (injected into prompt) ──────────────────────────────
AGENTS_RCA=""
if [ -f "/home/ubuntu/.openclaw/workspace/AGENTS.md" ]; then
  # Extract just the ZeroDefect and RCA sections — keep it concise
  AGENTS_RCA=$(grep -A 200 "ZeroDefect Ship Gate" /home/ubuntu/.openclaw/workspace/AGENTS.md 2>/dev/null | head -80 || echo "")
fi

# ── Build Claude request ──────────────────────────────────────────────────────
PROMPT="You are a senior code reviewer for AKAI, an AI-powered digital agency. Review the following git diff and identify any issues.

Check for:
1. **Bugs** — logic errors, off-by-ones, null/undefined access, race conditions
2. **Security issues** — hardcoded secrets (API keys, tokens, passwords), SQL injection, XSS vectors, exposed credentials
3. **Hardcoded values** — URLs, IDs, prices, emails that should be env vars or config
4. **Missing error handling** — unguarded async calls, missing try/catch on Firebase/Firestore writes, unhandled promise rejections
5. **RCA pattern violations** — based on AKAI's past production failures:
   - Hardcoded Railway/API URLs (use NEXT_PUBLIC_API_URL env var)
   - Firestore writes without try/catch
   - Auth changes without matching Playwright tests
   - Deprecated API usage (e.g. urn:ietf:wg:oauth:2.0:oob)
   - themeColor meta tags (deprecated in Next.js)
   - Unverified email domains used with Resend
   - Email templates with hardcoded user details (must use logged-in user data)
   - AKAI brand colours used on client deliverables (client must use their own brand)
6. **Code quality** — TODO/FIXME/HACK in production paths, console.log with sensitive data, dead code

AKAI ZeroDefect gates (partial — from AGENTS.md):
${AGENTS_RCA}

---
GIT DIFF:
${DIFF_TRUNCATED}
---

Respond in this exact format:

VERDICT: CLEAN | ISSUES_FOUND

If CLEAN:
SUMMARY: One sentence confirming what changed and that it looks good.

If ISSUES_FOUND:
SUMMARY: Brief overview of what changed.
ISSUES:
- [SEVERITY: HIGH|MEDIUM|LOW] File:line — Description of issue and how to fix it

Only output issues that are real, specific, and actionable. Do not flag style preferences or hypotheticals. If the diff is clean, say so clearly."

# Escape the prompt for JSON
PAYLOAD=$(jq -n \
  --arg model "claude-3-5-haiku-20241022" \
  --arg content "$PROMPT" \
  '{
    model: $model,
    max_tokens: 1024,
    messages: [
      {role: "user", content: $content}
    ]
  }')

# ── Call Claude ───────────────────────────────────────────────────────────────
RESPONSE=$(curl -s --max-time 60 \
  -X POST \
  -H "x-api-key: $ANTHROPIC_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "$PAYLOAD" \
  "https://api.anthropic.com/v1/messages" 2>/dev/null)

if [ -z "$RESPONSE" ]; then
  echo "⚠️  Claude API unreachable — skipping review (push not blocked)"
  exit 0
fi

# Extract the text content
REVIEW=$(echo "$RESPONSE" | jq -r '.content[0].text // empty' 2>/dev/null || echo "")

if [ -z "$REVIEW" ]; then
  # Check for API error
  API_ERROR=$(echo "$RESPONSE" | jq -r '.error.message // empty' 2>/dev/null || echo "")
  if [ -n "$API_ERROR" ]; then
    echo "⚠️  Claude API error: $API_ERROR — skipping review (push not blocked)"
    exit 0
  fi
  echo "⚠️  Unexpected Claude response — skipping review (push not blocked)"
  exit 0
fi

# ── Parse verdict ─────────────────────────────────────────────────────────────
echo ""
echo "$REVIEW"
echo ""

VERDICT=$(echo "$REVIEW" | grep "^VERDICT:" | awk '{print $2}')

if [ "$VERDICT" = "CLEAN" ]; then
  echo "✅ Code review: clean"
  exit 0
elif [ "$VERDICT" = "ISSUES_FOUND" ]; then
  echo "❌ Code review: issues found — push blocked"
  echo "   Fix the issues above and re-run, or override with: git push --no-verify"
  exit 1
else
  # Unknown verdict — don't block, but warn
  echo "⚠️  Review completed but verdict unclear — not blocking push"
  exit 0
fi
