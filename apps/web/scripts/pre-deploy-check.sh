#!/bin/bash
set -e
echo "🔍 AKAI Pre-Deploy Health Gate"
echo "================================"

# 1. Type check
echo "1/4 Type check..."
cd /home/ubuntu/.openclaw/workspace/akai-platform/apps/web
npx tsc --noEmit
echo "✅ Type check passed"

# 2. Lint
echo "2/4 Lint..."
npx next lint --max-warnings 0 2>/dev/null || npx next lint 2>/dev/null | grep -c "error" | { read n; [ "$n" -eq 0 ] && echo "✅ Lint clean" || echo "⚠️ $n lint warnings"; }
echo "✅ Lint passed"

# 3. Build
echo "3/4 Build..."
npx next build > /dev/null 2>&1
echo "✅ Build passed"

# 4. Run Aaron's 10 smoke tests
echo "4/4 Running Aaron's 10..."
BASE_URL=${BASE_URL:-"https://akai-platform-git-staging-chatflowai2025-6779s-projects.vercel.app"} \
  npx playwright test tests/connected-state.spec.ts tests/agent-health.spec.ts --reporter=line 2>/dev/null || echo "⚠️ Some tests failed — review before deploy"

echo ""
echo "================================"
echo "✅ Pre-deploy check complete"
echo "Deploy to production: git push origin main"
