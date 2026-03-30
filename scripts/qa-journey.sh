#!/bin/bash
# ============================================================
# AKAI QA Journey — Browser-less user journey smoke tests
# Adapted from gstack /qa agent pattern
#
# Tests key user journeys on https://getakai.ai via curl.
# Failures alert Discord and log to qa-journey.log
#
# Usage: bash scripts/qa-journey.sh [base-url]
# Exit 0 = all passed, Exit 1 = failures found
# ============================================================
set -euo pipefail

BASE_URL="${1:-https://getakai.ai}"
LOG_FILE="/home/ubuntu/.openclaw/workspace/logs/qa-journey.log"
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1487067273398063244/bcPm17Vawtt7Xq-sri56RRJ2ejIOM5LJj728BX7-6xaQHaOxkmtr8HPs8jDlVP_vBhNm"

PASS=0; FAIL=0
FAILED=()
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')

# ── Logging ───────────────────────────────────────────────────────────────────
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "$1" | tee -a "$LOG_FILE"
}

# ── Check helpers ─────────────────────────────────────────────────────────────
check() {
  local name="$1" result="$2" detail="${3:-}"
  if [ "$result" = "pass" ]; then
    log "  ✅ $name"
    PASS=$((PASS+1))
  else
    log "  ❌ $name${detail:+ — $detail}"
    FAIL=$((FAIL+1))
    FAILED+=("$name")
  fi
}

discord_alert() {
  local message="$1"
  curl -s -X POST "$DISCORD_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg msg "$message" '{content: $msg}')" \
    > /dev/null 2>&1 || true
}

# ── Header ────────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🧭 AKAI QA JOURNEY — $TIMESTAMP"
log "🌐 Target: $BASE_URL"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Journey 1: Homepage ───────────────────────────────────────────────────────
log ""
log "┌─ JOURNEY 1: Homepage"

HP_HTML=$(curl -s --max-time 20 "$BASE_URL" 2>/dev/null || echo "CURL_FAILED")
HP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL" 2>/dev/null || echo "000")

check "Homepage returns 200" "$([ "$HP_STATUS" = "200" ] && echo pass || echo fail)" "got $HP_STATUS"
check "Homepage contains 'Your AI Executive Team'" "$(echo "$HP_HTML" | grep -qi "Your AI Executive Team" && echo pass || echo fail)"
check "Homepage contains AKAI branding" "$(echo "$HP_HTML" | grep -qi "AKAI\|getakai" && echo pass || echo fail)"

# ── Journey 2: Login page ─────────────────────────────────────────────────────
log ""
log "┌─ JOURNEY 2: /login"

LOGIN_HTML=$(curl -s --max-time 20 "$BASE_URL/login" 2>/dev/null || echo "CURL_FAILED")
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL/login" 2>/dev/null || echo "000")

check "/login returns 200" "$([ "$LOGIN_STATUS" = "200" ] && echo pass || echo fail)" "got $LOGIN_STATUS"
check "/login contains 'Sign In'" "$(echo "$LOGIN_HTML" | grep -qi "Sign In\|sign-in\|signin" && echo pass || echo fail)"
check "/login contains 'Create Account'" "$(echo "$LOGIN_HTML" | grep -qi "Create Account\|Sign Up\|sign-up\|signup" && echo pass || echo fail)"

# ── Journey 3: Demo call API ──────────────────────────────────────────────────
log ""
log "┌─ JOURNEY 3: Demo call API"

DEMO_RESPONSE=$(curl -s --max-time 20 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"QA Test","email":"qa@getakai.ai","phone":"+61400000000"}' \
  "$BASE_URL/api/demo" 2>/dev/null || echo "CURL_FAILED")
DEMO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"QA Test","email":"qa@getakai.ai","phone":"+61400000000"}' \
  "$BASE_URL/api/demo" 2>/dev/null || echo "000")

# 200 or 201 = success; 422 = validation (also acceptable — API is reachable)
DEMO_OK=$([ "$DEMO_STATUS" = "200" ] || [ "$DEMO_STATUS" = "201" ] || [ "$DEMO_STATUS" = "422" ] || [ "$DEMO_STATUS" = "400" ] && echo true || echo false)
check "Demo call API reachable (200/201/400/422)" "$([ "$DEMO_OK" = "true" ] && echo pass || echo fail)" "got $DEMO_STATUS"

# ── Journey 4: Module routes ──────────────────────────────────────────────────
log ""
log "┌─ JOURNEY 4: Module routes (200 check)"

MODULES=("sales" "marketing" "email-guard" "calendar" "recruiter" "finance" "account-manager" "dashboard")

for module in "${MODULES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL/$module" 2>/dev/null || echo "000")
  # 200 = loaded, 307/302 = redirect to login (acceptable — protected route)
  ROUTE_OK=$([ "$STATUS" = "200" ] || [ "$STATUS" = "307" ] || [ "$STATUS" = "302" ] || [ "$STATUS" = "301" ] && echo true || echo false)
  check "/$module route accessible (200/30x)" "$([ "$ROUTE_OK" = "true" ] && echo pass || echo fail)" "got $STATUS"
done

# ── Journey 5: No stale "AI Clozr" branding ───────────────────────────────────
log ""
log "┌─ JOURNEY 5: Brand integrity"

# Scan homepage HTML for stale branding
check "No 'AI Clozr' on homepage" "$(echo "$HP_HTML" | grep -qiE 'AI Clozr|AIClozr' && echo fail || echo pass)"
check "No 'ContentLeads' on homepage" "$(echo "$HP_HTML" | grep -qiE 'ContentLeads|content-leads' && echo fail || echo pass)"

# Check /login page too
check "No 'AI Clozr' on /login" "$(echo "$LOGIN_HTML" | grep -qiE 'AI Clozr|AIClozr' && echo fail || echo pass)"

# ── Journey 6: Pricing check ──────────────────────────────────────────────────
log ""
log "┌─ JOURNEY 6: Pricing integrity"

# Fetch the page that contains pricing (may be homepage or /pricing)
PRICING_HTML="$HP_HTML"
PRICING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL/pricing" 2>/dev/null || echo "000")
if [ "$PRICING_STATUS" = "200" ]; then
  PRICING_HTML=$(curl -s --max-time 20 "$BASE_URL/pricing" 2>/dev/null || echo "")
fi

# Check for current AKAI pricing tiers: $199/$599/$1,200 (or $1200)
# Allow flexible formats: 199, $199, 199/mo, etc.
check "Pricing shows \$199 tier" "$(echo "$PRICING_HTML" | grep -qE '\$?199' && echo pass || echo fail)"
check "Pricing shows \$599 tier" "$(echo "$PRICING_HTML" | grep -qE '\$?599' && echo pass || echo fail)"
check "Pricing shows \$1,200 or \$1200 tier" "$(echo "$PRICING_HTML" | grep -qE '\$?1[,.]?200' && echo pass || echo fail)"

# ── Onboard route check ───────────────────────────────────────────────────────
log ""
log "┌─ JOURNEY 7: Onboard flow"

ONBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL/onboard" 2>/dev/null || echo "000")
check "/onboard accessible (200/30x)" "$([ "$ONBOARD_STATUS" = "200" ] || [ "$ONBOARD_STATUS" = "307" ] || [ "$ONBOARD_STATUS" = "302" ] && echo pass || echo fail)" "got $ONBOARD_STATUS"

# ── Summary ───────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  Total: $((PASS+FAIL)) | ✅ $PASS passed | ❌ $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  log ""
  FAIL_LIST=$(printf '%s\n' "${FAILED[@]}" | sed 's/^/  ❌ /')
  log "$FAIL_LIST"

  ALERT_MSG="🚨 **AKAI QA Journey FAILED** — $TIMESTAMP
$FAIL check(s) failed on $BASE_URL:
$(printf '%s\n' "${FAILED[@]}" | sed 's/^/• /')

Check logs: /home/ubuntu/.openclaw/workspace/logs/qa-journey.log"

  discord_alert "$ALERT_MSG"
  log ""
  log "  Discord alert sent. Fix failures before next deploy."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
else
  log "  ✅ All user journeys passing — $BASE_URL is healthy"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi
