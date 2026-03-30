#!/bin/bash
# ============================================================
# AKAI Security Check — OWASP-lite gate
# Adapted from gstack security pattern
#
# Runs on changed files before every push.
# Exit 0 = clean, Exit 1 = violations found (blocks push)
# ============================================================
set -euo pipefail

BASE_BRANCH="${1:-main}"
PASS=0; FAIL=0
ISSUES=()

flag() {
  local msg="$1"
  echo "  ❌ $msg"
  FAIL=$((FAIL+1))
  ISSUES+=("$msg")
}

ok() {
  echo "  ✅ $1"
  PASS=$((PASS+1))
}

warn() {
  echo "  ⚠️  $1"
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 AKAI SECURITY CHECK — $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Get changed files ─────────────────────────────────────────────────────────
if git show-ref --verify --quiet refs/remotes/origin/"$BASE_BRANCH"; then
  CHANGED_FILES=$(git diff --name-only origin/"$BASE_BRANCH"...HEAD 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null || echo "")
else
  CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || echo "")
fi

if [ -z "$CHANGED_FILES" ]; then
  echo "ℹ️  No changed files found — nothing to check"
  exit 0
fi

FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
echo "  Checking $FILE_COUNT changed file(s)..."
echo ""

# Build a tempfile of all changed content for scanning
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

while IFS= read -r f; do
  if [ -f "$f" ]; then
    # Add filename header so we can reference it in errors
    echo "=== FILE: $f ===" >> "$TMPFILE"
    cat "$f" >> "$TMPFILE"
  fi
done <<< "$CHANGED_FILES"

# ── Check 1: Hardcoded API keys / secrets ─────────────────────────────────────
echo "┌─ CHECK 1: Hardcoded secrets"

# Patterns that should never appear in source (exclude .env files explicitly)
SECRET_PATTERNS=(
  'sk-ant-api[0-9A-Za-z_-]{30,}'   # Anthropic keys
  'sk_live_[0-9A-Za-z]{24,}'        # Stripe live keys
  'sk_test_[0-9A-Za-z]{24,}'        # Stripe test keys
  'ghp_[0-9A-Za-z]{36}'             # GitHub personal tokens
  'gho_[0-9A-Za-z]{36}'             # GitHub OAuth tokens
  'AIzaSy[0-9A-Za-z_-]{33}'         # Google API keys
  'org_[0-9A-Za-z]{20,}'            # Various org keys
  'whsec_[0-9A-Za-z]{30,}'          # Stripe webhook secrets
  're_[A-Za-z0-9]{20,}'             # Resend API keys
  'xoxb-[0-9A-Za-z-]{40,}'          # Slack bot tokens
  'EAA[A-Za-z0-9]{50,}'             # Meta/Facebook tokens
  'ya29\.[0-9A-Za-z_-]{60,}'        # Google OAuth access tokens
)

SECRET_FOUND=false
for pattern in "${SECRET_PATTERNS[@]}"; do
  MATCHES=$(grep -rE "$pattern" "$TMPFILE" 2>/dev/null | grep -v "# example\|# placeholder\|YOUR_KEY\|your_key\|<YOUR\|REPLACE_ME\|example\.com\|fake\|mock\|test.*=.*sk_test" | grep -v "^=== FILE:" | head -3 || true)
  if [ -n "$MATCHES" ]; then
    flag "Hardcoded secret detected (pattern: $pattern)"
    echo "$MATCHES" | head -3 | sed 's/^/     /'
    SECRET_FOUND=true
  fi
done
$SECRET_FOUND || ok "No hardcoded secrets found"

# ── Check 2: console.log with sensitive data ──────────────────────────────────
echo ""
echo "┌─ CHECK 2: console.log sensitive data"

SENSITIVE_LOG=$(grep -nE 'console\.(log|warn|error|info)\s*\(.*\b(password|token|secret|apiKey|api_key|credential|auth|bearer|Authorization)\b' "$TMPFILE" 2>/dev/null | grep -v "// eslint-disable\|// ok: logged" | head -5 || true)

if [ -n "$SENSITIVE_LOG" ]; then
  flag "console.log with sensitive variable names detected"
  echo "$SENSITIVE_LOG" | head -5 | sed 's/^/     /'
else
  ok "No sensitive console.log patterns"
fi

# ── Check 3: External API calls — error handling ──────────────────────────────
echo ""
echo "┌─ CHECK 3: External API call error handling"

# Look for fetch() / axios calls NOT inside try/catch blocks
# Strategy: find files with fetch/axios, then check if they have try/catch
TS_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)

UNGUARDED_FETCH=false
if [ -n "$TS_FILES" ]; then
  while IFS= read -r f; do
    if [ -f "$f" ] && grep -qE '\bfetch\(|axios\.' "$f" 2>/dev/null; then
      # If the file has fetch but no try/catch and no .catch( — flag it
      if ! grep -qE 'try\s*\{|\.catch\(' "$f" 2>/dev/null; then
        flag "External fetch/axios call without try/catch in: $f"
        UNGUARDED_FETCH=true
      fi
    fi
  done <<< "$TS_FILES"
fi
$UNGUARDED_FETCH || ok "External API calls appear to have error handling"

# ── Check 4: TODO/FIXME/HACK in production code paths ────────────────────────
echo ""
echo "┌─ CHECK 4: TODO/FIXME/HACK in production paths"

# Exclude test files, scripts, and docs
PROD_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' | grep -vE '\.(test|spec)\.(ts|tsx|js|jsx)$' | grep -vE '^(scripts|docs|tests|__tests__)/' | grep -v '\.config\.' || true)

TODO_FOUND=false
if [ -n "$PROD_FILES" ]; then
  TODO_MATCHES=$(grep -nE '\b(TODO|FIXME|HACK|XXX)\b' $(echo "$PROD_FILES" | tr '\n' ' ') 2>/dev/null | grep -v "// eslint-disable\|// intentional" | head -10 || true)
  if [ -n "$TODO_MATCHES" ]; then
    flag "TODO/FIXME/HACK comments in production code paths"
    echo "$TODO_MATCHES" | head -10 | sed 's/^/     /'
    TODO_FOUND=true
  fi
fi
$TODO_FOUND || ok "No TODO/FIXME/HACK in production code paths"

# ── Check 5: Firestore writes have try/catch (RCA from AGENTS.md) ─────────────
echo ""
echo "┌─ CHECK 5: Firestore write safety"

TS_FILES_LIST=$(echo "$CHANGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' || true)

UNSAFE_FIRESTORE=false
if [ -n "$TS_FILES_LIST" ]; then
  while IFS= read -r f; do
    if [ -f "$f" ] && grep -qE '\b(setDoc|updateDoc|addDoc|deleteDoc|writeBatch|runTransaction)\s*\(' "$f" 2>/dev/null; then
      if ! grep -qE 'try\s*\{' "$f" 2>/dev/null; then
        flag "Firestore write without try/catch in: $f"
        UNSAFE_FIRESTORE=true
      fi
    fi
  done <<< "$TS_FILES_LIST"
fi
$UNSAFE_FIRESTORE || ok "All Firestore writes appear to have try/catch"

# ── Check 6: AI Clozr branding leak ──────────────────────────────────────────
echo ""
echo "┌─ CHECK 6: Stale branding check"

BRAND_LEAK=$(grep -rniE 'ai clozr|aiclozr|contentleads' "$TMPFILE" 2>/dev/null | grep -v "^=== FILE:\|# legacy\|// legacy" | head -5 || true)
if [ -n "$BRAND_LEAK" ]; then
  flag "Stale brand reference ('AI Clozr' / 'ContentLeads') found in changed files"
  echo "$BRAND_LEAK" | head -5 | sed 's/^/     /'
else
  ok "No stale brand references"
fi

# ── Check 7: Deprecated OAuth pattern (RCA #12) ──────────────────────────────
echo ""
echo "┌─ CHECK 7: Deprecated OAuth check"

OOB_OAUTH=$(grep -rniE 'urn:ietf:wg:oauth:2\.0:oob' "$TMPFILE" 2>/dev/null | grep -v "^=== FILE:" | head -3 || true)
if [ -n "$OOB_OAUTH" ]; then
  flag "Deprecated OAuth redirect URI 'urn:ietf:wg:oauth:2.0:oob' found — blocked by Google since 2022"
  echo "$OOB_OAUTH" | head -3 | sed 's/^/     /'
else
  ok "No deprecated OAuth patterns"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Total: $((PASS+FAIL)) | ✅ $PASS passed | ❌ $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "  Security violations:"
  for issue in "${ISSUES[@]}"; do
    echo "    ❌ $issue"
  done
  echo ""
  echo "  Fix all issues before pushing."
  echo "  Override (not recommended): git push --no-verify"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
else
  echo "  ✅ Security check: clean"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi
