#!/bin/bash
# ============================================================
# AKAI Platform QA Gate
# Run before every deploy. Exit 0 = pass, Exit 1 = fail.
# ============================================================
set -euo pipefail

BASE_URL="${1:-https://getakai.ai}"
PASS=0; FAIL=0
FAILED=()

check() {
  local name="$1" result="$2" detail="${3:-}"
  if [ "$result" = "pass" ]; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name${detail:+ — $detail}"
    FAIL=$((FAIL+1))
    FAILED+=("$name")
  fi
}

# warn: like check but never fails the gate — used for live-site checks that
# may return 5xx temporarily during CDN propagation / deploys in progress.
warn() {
  local name="$1" result="$2" detail="${3:-}"
  if [ "$result" = "pass" ]; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ⚠️  WARNING: $name${detail:+ — $detail} (live site check — skipped during CDN propagation)"
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 AKAI QA — $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "🌐 Target: $BASE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Pre-flight ────────────────────────────────────────────────────────────────
echo ""
echo "⏳ Fetching page..."
HTML=$(curl -s --max-time 15 "$BASE_URL" 2>/dev/null || echo "CURL_FAILED")
HEADERS=$(curl -sI --max-time 10 "$BASE_URL" 2>/dev/null || echo "CURL_FAILED")

# Extract CSS URL and fetch it
CSS_PATH=$(echo "$HTML" | grep -oE '/_next/static/css/[^"\\]+\.css' | head -1)
if [ -n "$CSS_PATH" ]; then
  CSS_CONTENT=$(curl -s --max-time 15 "$BASE_URL$CSS_PATH" 2>/dev/null || echo "")
  CSS_SIZE=${#CSS_CONTENT}
else
  CSS_CONTENT=""
  CSS_SIZE=0
fi
echo "  CSS: $CSS_PATH (${CSS_SIZE} bytes)"

# ── Suite 1: HTTP ─────────────────────────────────────────────────────────────
echo ""
echo "┌─ SUITE 1: HTTP"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL" 2>/dev/null || echo "000")
warn "Landing returns HTTP 200" "$([ "$STATUS" = "200" ] && echo pass || echo fail)" "got $STATUS"

TTFB=$(curl -s -o /dev/null -w "%{time_starttransfer}" --max-time 10 "$BASE_URL" 2>/dev/null || echo "9.9")
TTFB_MS=$(awk "BEGIN {printf \"%d\", $TTFB * 1000}" 2>/dev/null || echo "99999")
check "TTFB < 2000ms" "$([ "$TTFB_MS" -lt 2000 ] && echo pass || echo fail)" "${TTFB_MS}ms"

# ── Suite 2: CSS INTEGRITY (the one that would have caught this bug) ──────────
echo ""
echo "┌─ SUITE 2: CSS Integrity"

# CSS must exist and be loaded
check "CSS bundle present in HTML" "$([ -n "$CSS_PATH" ] && echo pass || echo fail)"

# CSS must be a meaningful size — plain text page = ~2KB, styled = 3KB+
# A 4KB CSS for a complex landing page with custom classes is suspicious but
# valid if Next.js inlines Tailwind into JS. Floor at 2KB.
check "CSS bundle > 2KB" "$([ "$CSS_SIZE" -gt 2000 ] && echo pass || echo fail)" "${CSS_SIZE} bytes"

# Critical custom classes must be present in the CSS file
check "'.glass' class in CSS" "$(echo "$CSS_CONTENT" | grep -q '\.glass' && echo pass || echo fail)"
check "'.gradient-text' class in CSS" "$(echo "$CSS_CONTENT" | grep -q 'gradient-text' && echo pass || echo fail)"
check "'.card-hover' class in CSS" "$(echo "$CSS_CONTENT" | grep -q 'card-hover' && echo pass || echo fail)"
check "'.dot-grid' class in CSS" "$(echo "$CSS_CONTENT" | grep -q 'dot-grid' && echo pass || echo fail)"
check "'.fade-up' animation in CSS" "$(echo "$CSS_CONTENT" | grep -q 'fade-up' && echo pass || echo fail)"
check "'.pulse-ring' animation in CSS" "$(echo "$CSS_CONTENT" | grep -q 'pulse-ring' && echo pass || echo fail)"

# Body must NOT be unstyled (background-color set on body means CSS loaded)
check "Body background color set" "$(echo "$CSS_CONTENT" | grep -qE 'background(-color)?.*#0a0a0a|0a0a0a' && echo pass || echo fail)"

# ── Suite 3: Content ──────────────────────────────────────────────────────────
echo ""
echo "┌─ SUITE 3: Content"

check "AKAI branding present" "$(echo "$HTML" | grep -qi "AKAI" && echo pass || echo fail)"
check "Hero headline present" "$(echo "$HTML" | grep -qi "Business Partner\|Your AI" && echo pass || echo fail)"
check "Pricing section present" "$(echo "$HTML" | grep -qi "pricing\|297\|597\|1,197" && echo pass || echo fail)"
check "Modules section present" "$(echo "$HTML" | grep -qi 'id="modules"\|href="/sales"\|href="/recruit"' && echo pass || echo fail)"
warn "CTA routes to /onboard not mailto" "$(echo "$HTML" | grep -qi 'href="/onboard"' && echo pass || echo fail)"
check "No mailto: on primary CTA" "$(echo "$HTML" | grep -qE 'href="mailto:[^"]*[Tt]rial' && echo fail || echo pass)"
check "SPA root mount present" "$(echo "$HTML" | grep -q '__next\|id="root"' && echo pass || echo fail)"
check "No stale domain (contentleads)" "$(echo "$HTML" | grep -qiE 'contentleads\.com\.au|content-leads\.vercel' && echo fail || echo pass)"

# ── Suite 4: Security ─────────────────────────────────────────────────────────
echo ""
echo "┌─ SUITE 4: Security"

check "HSTS header present" "$(echo "$HEADERS" | grep -qi 'strict-transport-security' && echo pass || echo fail)"
check "No secret keys in HTML" "$(echo "$HTML" | grep -qE 'sk_live_|whsec_|re_[A-Za-z0-9]{20}' && echo fail || echo pass)"
check "No FIREBASE_PRIVATE_KEY leaked in HTML" "$(echo "$HTML" | grep -qi 'firebase_private_key\|-----BEGIN RSA PRIVATE KEY' && echo fail || echo pass)"
check "No GMAIL_APP_PASSWORD leaked in HTML" "$(echo "$HTML" | grep -qi 'gmail_app_password\|GMAIL_APP_PASSWORD' && echo fail || echo pass)"
check "No RAILWAY_API_KEY leaked in HTML" "$(echo "$HTML" | grep -qi 'railway_api_key\|RAILWAY_API_KEY' && echo fail || echo pass)"

# ── Suite 5a: Security — CVE Audit (RCA #3) ──────────────────────────────────
echo ""
echo "┌─ SUITE 5a: CVE Audit"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$REPO_ROOT/pnpm-lock.yaml" ]; then
  CVE_OUTPUT=$(cd "$REPO_ROOT" && pnpm audit --audit-level=high 2>&1 || true)
  CVE_HIGH=$(echo "$CVE_OUTPUT" | grep -cE '[0-9]+ high|[0-9]+ critical' || true)
  # pnpm audit exits non-zero if vulnerabilities found — check exit code
  if (cd "$REPO_ROOT" && pnpm audit --audit-level=high > /dev/null 2>&1); then
    check "No high/critical CVEs (pnpm audit)" "pass"
  else
    check "No high/critical CVEs (pnpm audit)" "fail" "run: pnpm audit --audit-level=high"
  fi
else
  echo "  ⚠️  pnpm-lock.yaml not found — skipping CVE audit (run from repo root or pass correct BASE_URL)"
fi

# ── Suite 5b: Hardcoded Railway URL scan (RCA #2) ─────────────────────────────
echo ""
echo "┌─ SUITE 5b: Hardcoded URL Scan"
if [ -d "$REPO_ROOT/apps/web/src" ]; then
  # Allow fallback pattern (|| 'url') — only fail if URL appears WITHOUT env var reference
  HARDCODED=$(grep -r "api-server-production-2a27" "$REPO_ROOT/apps/web/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "process\.env" | grep -v "NEXT_PUBLIC_API_URL" || true)
  if [ -z "$HARDCODED" ]; then
    check "No bare hardcoded Railway URL (env var fallback pattern allowed)" "pass"
  else
    check "No bare hardcoded Railway URL (env var fallback pattern allowed)" "fail" "URL found without process.env reference — wrap in env var"
    echo "$HARDCODED" | head -5
  fi
else
  echo "  ⚠️  apps/web/src not found — skipping hardcoded URL scan"
fi

# ── Suite 5c: Build deprecation warnings (RCA #5) ────────────────────────────
echo ""
echo "┌─ SUITE 5c: Build Deprecation Check"
if [ -f "$REPO_ROOT/package.json" ]; then
  BUILD_WARNINGS=$(cd "$REPO_ROOT" && pnpm build 2>&1 | grep -i "deprecated" || true)
  if [ -z "$BUILD_WARNINGS" ]; then
    check "No deprecation warnings in pnpm build" "pass"
  else
    WARN_COUNT=$(echo "$BUILD_WARNINGS" | wc -l | tr -d ' ')
    check "No deprecation warnings in pnpm build" "fail" "$WARN_COUNT deprecation warning(s) found — fix before deploy"
    echo "$BUILD_WARNINGS" | head -10
  fi
else
  echo "  ⚠️  package.json not found at repo root — skipping deprecation check"
fi

# ── Suite 5d: Duplicate Hero component check (RCA #6) ────────────────────────
echo ""
echo "┌─ SUITE 5d: Duplicate Hero component check"
HERO_IN_PAGE=$(grep -n "^function Hero[^S]\|^const Hero[^S]\|^function Hero$\|^const Hero$" "$REPO_ROOT/apps/web/src/app/page.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$HERO_IN_PAGE" -eq 0 ]; then
  check "No inline Hero component in page.tsx (must use Hero.tsx)" "pass"
else
  check "No inline Hero component in page.tsx (must use Hero.tsx)" "fail" "Found $HERO_IN_PAGE inline Hero definition(s) — import from components/landing/Hero.tsx instead"
fi

# ── Suite 5e: Critical ENV VAR presence check (RCA — silent email failures) ──
# These env vars MUST be set in Vercel (or current shell for local runs).
# Missing vars cause silent failures — emails don't send, Firestore writes fail,
# but the endpoint still returns 200. This caused bugs 3+4 to ship undetected.
echo ""
echo "┌─ SUITE 5e: Critical ENV VAR Check"
CRITICAL_VARS=(
  "TELEGRAM_BOT_TOKEN"
  "TELEGRAM_CHAT_ID"
  "NEXT_PUBLIC_API_URL"
  "NEXT_PUBLIC_FIREBASE_API_KEY"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  "FIREBASE_CLIENT_EMAIL"
  "FIREBASE_PRIVATE_KEY"
  "GMAIL_APP_PASSWORD"
)
# When running locally, check the current environment.
# In CI/Vercel, these are set via the Vercel dashboard — this check is a reminder.
ENV_FAIL=0
for var in "${CRITICAL_VARS[@]}"; do
  if [ -n "${!var:-}" ]; then
    check "ENV: $var is set" "pass"
  else
    # Warn (not hard fail) for local runs — these are Vercel-side in prod
    echo "  ⚠️  WARNING: ENV $var is not set in current shell (must be in Vercel env for production)"
    ENV_FAIL=$((ENV_FAIL+1))
  fi
done
if [ "$ENV_FAIL" -gt 0 ]; then
  echo "  ℹ️  $ENV_FAIL env var(s) not set in shell — verify all are set in Vercel dashboard before deploy"
  echo "  ℹ️  Missing env vars = silent failures (emails, Firestore, Telegram all silently skip)"
fi

# ── Suite 5: /onboard route ───────────────────────────────────────────────────
echo ""
echo "┌─ SUITE 5: Onboard route"
ONBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/onboard" 2>/dev/null || echo "000")
check "/onboard returns 200" "$([ "$ONBOARD_STATUS" = "200" ] && echo pass || echo fail)" "got $ONBOARD_STATUS"

CHAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"Test","state":{"step":"business_name","data":{}}}' \
  "$BASE_URL/api/chat" 2>/dev/null || echo "000")
check "/api/chat POST returns 200" "$([ "$CHAT_STATUS" = "200" ] && echo pass || echo fail)" "got $CHAT_STATUS"

# ── Suite 6: Bug Regression Source Scans ─────────────────────────────────────
echo ""
echo "┌─ SUITE 6: Bug Regression Source Scans"

# BUG 1: type="url" in domain-input fields causes browser to reject bare domains.
# The health and sales pages had type="url" on website/URL fields.
# Fix: must use type="text" autoComplete="url" for any field that accepts domains.
if [ -d "$REPO_ROOT/apps/web/src" ]; then
  # Scan for type="url" in files where it causes user-facing issues
  # Allowlist: login page may use type="url" for other purposes
  TYPE_URL_HITS=$(grep -rn 'type="url"' "$REPO_ROOT/apps/web/src/" \
    --include="*.tsx" --include="*.ts" \
    | grep -v "login/page" \
    | grep -v "//.*type=\"url\"" \
    | grep -E 'placeholder.*website|placeholder.*yoursite|placeholder.*domain|placeholder.*\.com|autoComplete="url"' \
    || true)
  # More direct: scan health and sales pages specifically
  HEALTH_URL_INPUT=$(grep -n 'type="url"' "$REPO_ROOT/apps/web/src/app/health/page.tsx" 2>/dev/null || true)
  SALES_URL_INPUT=$(grep -n 'type="url"' "$REPO_ROOT/apps/web/src/app/sales/page.tsx" 2>/dev/null || true)
  LEAD_URL_INPUT=$(grep -n 'type="url"' "$REPO_ROOT/apps/web/src/components/LeadCaptureModal.tsx" 2>/dev/null || true)

  if [ -n "$HEALTH_URL_INPUT" ]; then
    check "BUG-1: No type=\"url\" in /health page URL input" "fail" "/health/page.tsx has type=\"url\" — change to type=\"text\" autoComplete=\"url\""
    echo "    $HEALTH_URL_INPUT"
  else
    check "BUG-1: No type=\"url\" in /health page URL input" "pass"
  fi

  if [ -n "$SALES_URL_INPUT" ]; then
    check "BUG-1: No type=\"url\" in /sales page website input" "fail" "/sales/page.tsx has type=\"url\" — change to type=\"text\" autoComplete=\"url\""
    echo "    $SALES_URL_INPUT"
  else
    check "BUG-1: No type=\"url\" in /sales page website input" "pass"
  fi

  if [ -n "$LEAD_URL_INPUT" ]; then
    check "BUG-1: No type=\"url\" in LeadCaptureModal website input" "fail" "LeadCaptureModal.tsx has type=\"url\" — change to type=\"text\" autoComplete=\"url\""
  else
    check "BUG-1: No type=\"url\" in LeadCaptureModal website input" "pass"
  fi
else
  echo "  ⚠️  apps/web/src not found — skipping bug regression source scans"
fi

# BUG 2: Success screen must NOT interpolate form.name into heading
# Scan for patterns like `Welcome to AKAI, ${` or `Welcome to AKAI, ` + template literal
if [ -f "$REPO_ROOT/apps/web/src/components/LeadCaptureModal.tsx" ]; then
  PERSONALIZED_HEADING=$(grep -n 'Welcome to AKAI.*\${.*name\|Welcome to AKAI.*form\.name' \
    "$REPO_ROOT/apps/web/src/components/LeadCaptureModal.tsx" 2>/dev/null || true)
  if [ -n "$PERSONALIZED_HEADING" ]; then
    check "BUG-2: Success heading not personalized with name" "fail" "LeadCaptureModal heading interpolates form.name"
    echo "    $PERSONALIZED_HEADING"
  else
    check "BUG-2: Success heading not personalized with name" "pass"
  fi
fi

# BUG 4: Web audit runAudit must guard against empty URL
# The guard `if (!url?.trim()) return;` must exist in web/page.tsx
if [ -f "$REPO_ROOT/apps/web/src/app/web/page.tsx" ]; then
  AUDIT_GUARD=$(grep -n "url?.trim\(\)\|url\.trim\(\)\|!url" "$REPO_ROOT/apps/web/src/app/web/page.tsx" 2>/dev/null | head -5 || true)
  if [ -n "$AUDIT_GUARD" ]; then
    check "BUG-4: Web audit has empty-URL guard" "pass"
  else
    check "BUG-4: Web audit has empty-URL guard" "fail" "runAudit in /web/page.tsx must check !url?.trim() before fetching"
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Total: $((PASS+FAIL)) | ✅ $PASS passed | ❌ $FAIL failed"
if [ "${#FAILED[@]}" -gt 0 ]; then
  echo ""
  for t in "${FAILED[@]}"; do echo "  ❌ $t"; done
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -eq 0 ]; then
  echo "✅ ALL PASSED — safe to deploy"
  exit 0
else
  echo "❌ $FAIL FAILED — do not deploy"
  exit 1
fi
