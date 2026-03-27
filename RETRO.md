# Post-Release Retrospective — AKAI Platform
**Date:** 2026-03-27  
**Triggered by:** CEO-found bugs during live product review  
**Severity:** P0 — The CEO should never be QA. This is a process failure, not just a bug list.

---

## What Happened (Plain English)

Aaron found 6 bugs during a live review session. Every single one should have been caught before he touched the product. They weren't. That's on us — on the process, the code standards, and the review culture.

No blame, but no sugarcoating either. Here's the full breakdown.

---

## 🧱 PLATFORM AGENT — Release Process Assessment

### Frank Assessment

The existing QA gate (`scripts/qa.sh`) only checks HTTP responses, CSS bundle integrity, and static content strings. It has **zero coverage of application behaviour** — form state, Firestore writes, React rendering logic, or UI layout. A script that checks whether "AKAI" appears in HTML is not a QA gate. It's a smoke test.

We shipped without:
- Any form interaction testing
- Any Firestore write path testing  
- Any React hook dependency review
- Any mobile/responsive layout check
- Any copy/branding string diff against spec

### What Gates Were Missing

| Bug | Gate That Should Have Caught It | Status |
|-----|----------------------------------|--------|
| Settings form reset on keystroke | Playwright: type in a field, verify it persists | ❌ Missing |
| Firestore crash on AK chat | Integration test: send a message, check no exception | ❌ Missing |
| Voice Step 2 static placeholders | E2E: walk onboarding Step 2, verify options render | ❌ Missing |
| Web audit silent failure loop | E2E: trigger audit, verify feedback appears | ❌ Missing |
| Social buttons overlapping | Visual regression or responsive layout check | ❌ Missing |
| AK branding wrong | Copy spec diff / string assertion | ❌ Missing (qa.sh had it but the check was too loose) |

### Concrete Action Items

1. **Every PR touching a form must include a Playwright test that types into the form and verifies field values persist.**
2. **Every PR touching Firestore writes must include a test that triggers the write and asserts no exception is thrown.**
3. **Visual review of every page at 375px, 768px, 1280px before merge — not after.**
4. **A branding/copy spec file (`COPY_SPEC.md`) must exist and qa.sh must diff against it for critical strings.**
5. **Pre-push hook must run `pnpm type-check` and `pnpm lint` — not optional.**

---

## 🔧 CTO — Code Quality & Architecture Assessment

### Frank Assessment

Four of the six bugs are the **same two root patterns** showing up in different places. We're not dealing with random mistakes — we're dealing with systemic gaps in how we write React and handle data safety. Until we enforce rules that make these bugs impossible to write, they will keep coming back.

### Systemic Patterns

**Pattern 1: Unstable useEffect / useCallback dependencies**
- Bug #1 (Settings form): `useEffect` depends on whole `user` object → re-fires on every render
- Bug #4 (Web audit): `notified` in `useCallback` dep array → infinite re-trigger loop

Same root cause: **object references in React dependency arrays without stabilisation**. This will keep happening until we lint for it.

**Pattern 2: Unsafe spread of potentially-undefined values into external writes**
- Bug #2 (Firestore crash): `...data.buttons` where `data.buttons` is `undefined`

Same root cause: **no null-safety on object spreads before external writes**. TypeScript strict mode would have flagged this. We don't have it enforced.

**Pattern 3: Component rendering from unverified data sources**
- Bug #3 (Voice Step 2): Onboarding data wasn't being read — component rendered placeholder

Root cause: **no prop validation / data-present guard before rendering interactive components**.

**Pattern 4: Layout assumptions at responsive breakpoints**
- Bug #5 (Social buttons): `sm:grid-cols-4` breaks at certain container widths

Root cause: **Tailwind grid breakpoints applied without container-width awareness**.

### 5 Concrete Coding Standards

#### Standard 1 — useEffect/useCallback Primitive Dependencies Only

```typescript
// ❌ BANNED — object reference in dep array
useEffect(() => { ... }, [user]);
useCallback(() => { ... }, [notified]);

// ✅ REQUIRED — primitive values only
useEffect(() => { ... }, [user?.uid]);
useCallback(() => { ... }, []); // or stable refs via useRef
```

**Enforcement:** Add `eslint-plugin-react-hooks` exhaustive-deps rule at `error` level. Add custom lint note: "If you need an object in deps, extract the primitive value you actually depend on."

#### Standard 2 — No Unsafe Spread Into External Writes

```typescript
// ❌ BANNED — spreading potentially undefined
await setDoc(ref, { ...data.buttons });

// ✅ REQUIRED — explicit guard before spread
const buttons = data.buttons ?? [];
await setDoc(ref, { buttons });
```

**Enforcement:** Enable `@typescript-eslint/no-unsafe-spread` and `@typescript-eslint/strict-boolean-expressions`. Enable `strict: true` in all `tsconfig.json` files.

#### Standard 3 — Data-Present Guards Before Interactive Render

```typescript
// ❌ BANNED — render with unvalidated data
return <OptionList options={onboardingData.options} />;

// ✅ REQUIRED — explicit loading/empty state
if (!onboardingData?.options?.length) return <LoadingState />;
return <OptionList options={onboardingData.options} />;
```

**Enforcement:** Code review checklist item: "Does every component that renders from fetched/async data have an explicit empty/loading guard?"

#### Standard 4 — Responsive Breakpoints Require Container Audit

```tsx
// ❌ BANNED — grid cols without checking container width
<div className="sm:grid-cols-4">

// ✅ REQUIRED — use fewer cols or responsive gap management when in constrained containers
<div className="grid-cols-2 md:grid-cols-4">
// OR: add a PR comment explaining why 4 cols works at this breakpoint
```

**Enforcement:** PR review must include a screenshot at 375px for any layout change.

#### Standard 5 — TypeScript Strict Mode Everywhere

Add to all `tsconfig.json` files:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

This alone would have caught the `data.buttons` Firestore crash at compile time.

### Immediate ESLint Config Changes Required

Add to `apps/web/.eslintrc.json` (or equivalent):
```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/strict-boolean-expressions": "error",
    "no-unsafe-optional-chaining": "error"
  }
}
```

---

## 🎨 CREATIVE DIRECTOR — UX & First Impressions Assessment

### Frank Assessment

Three of these six bugs are **UX failures, not just code bugs**. A crash is a code bug. But a form that wipes your data as you type, a feature that renders placeholder text instead of real options, and buttons that visually overlap — those are failures of craft. They signal to the user: *this product wasn't finished*. For a product positioning itself as a premium AI business partner, that's brand damage.

### UX Failures (Not Just Code)

**Bug #1 — Settings form reset:** Not just a React bug. It's a trust failure. Users entering their business profile data expect it to persist. When it doesn't, they don't think "there's a useEffect issue" — they think "this product doesn't work". **UX failure.**

**Bug #3 — Voice Step 2 placeholders:** Static placeholder text in an onboarding flow tells the user the product is unfinished. Onboarding is the highest-stakes moment in the product. If it looks broken here, users churn immediately. **UX failure.**

**Bug #5 — Social buttons overlapping:** Overlapping UI elements signal sloppiness. This one is 100% visible without any testing — you just have to *look* at the screen. **Visual craft failure.**

**Bug #6 — AK branding wrong:** "AK — AKAI" instead of "Your AI Business Partner" on the homepage. This is the first thing users see. It means the product shipped without anyone reading the homepage. **Brand failure.**

### First Impressions Checklist

Before **any** feature ships, a human must check these 10 things (not a script — human eyes):

```
FIRST IMPRESSIONS CHECKLIST — Required before every ship

1. [ ] Homepage headline is correct — matches copy spec, not placeholder/old text
2. [ ] All interactive forms: type into every field, verify text persists without reset
3. [ ] All onboarding steps: walk every step, verify dynamic content loads (not placeholders)
4. [ ] All buttons: visible, non-overlapping, correct labels at mobile (375px) AND desktop
5. [ ] All new features viewed at 375px (iPhone SE), 768px (tablet), 1280px (desktop)
6. [ ] Loading states exist for every async operation (no silent loading)
7. [ ] Error states are user-friendly — no raw error objects, no blank screens
8. [ ] Branding strings match spec: product name, tagline, CTA copy
9. [ ] Critical user flows completed end-to-end without any error in browser console
10. [ ] New feature doesn't visually break adjacent features (scroll the full page)
```

### Visual Review Process

- **Who:** Every PR with UI changes requires a visual review from a second person (or self-review with recorded screen at all 3 breakpoints)
- **When:** Before merge, not after deploy
- **How:** Screen recording of the happy path at 375px + 1280px attached to PR

---

## ✅ UPDATED ZeroDefect Ship Gate

This replaces the checklist in `AGENTS.md`. The old gate was necessary but insufficient.

```
ZeroDefect Ship Gate — Updated 2026-03-27

PRE-MERGE (before any PR is merged):
- [ ] pnpm type-check passes with zero errors (strict mode on)
- [ ] pnpm lint passes with zero errors (react-hooks/exhaustive-deps at error level)
- [ ] New Playwright tests written for the specific feature (not just existing suite)
- [ ] All new tests pass green
- [ ] If PR touches a form: test that field values persist after typing
- [ ] If PR touches Firestore writes: test that write completes without exception
- [ ] If PR touches UI layout: screenshot/recording at 375px and 1280px attached to PR
- [ ] If PR touches onboarding: walk every affected step and verify dynamic content loads
- [ ] No unsafe spreads of potentially-undefined values into external writes
- [ ] No whole-object references in useEffect/useCallback dependency arrays

PRE-DEPLOY (before triggering any deploy):
- [ ] Security audit covers BOTH backend AND frontend (HTML/JS included)
- [ ] Hardcoded config values in frontend verified against live env vars
- [ ] Critical copy strings diff'd against COPY_SPEC.md (homepage, CTAs, branding)
- [ ] qa.sh passes green on staging URL
- [ ] Visual check: walk the homepage, onboarding flow, and changed features by hand

NEVER SHIP IF:
- CEO has not seen the product in its current state at least once in staging
- Any P0 form, onboarding, or chat feature shows placeholder content
- Browser console shows unhandled errors on the happy path
- Mobile layout is unverified
```

---

## 📋 Bug-by-Bug Disposition

| # | Bug | Root Cause | Fix | Recurrence Prevention |
|---|-----|------------|-----|-----------------------|
| 1 | Settings form reset | `useEffect([user])` → should be `[user?.uid]` | Fix dep array | eslint react-hooks/exhaustive-deps error |
| 2 | Firestore crash | `...data.buttons` undefined spread | `const buttons = data.buttons ?? []` | TypeScript strict + no-unsafe-assignment |
| 3 | Voice Step 2 placeholders | Onboarding data not read | Fix data fetch in component | E2E test walks every onboarding step |
| 4 | Web audit silent loop | `notified` in useCallback deps | Move notified to ref or remove from deps | eslint react-hooks/exhaustive-deps error |
| 5 | Social buttons overlapping | `sm:grid-cols-4` in cramped layout | `grid-cols-2 md:grid-cols-4` | Visual review at 375px before merge |
| 6 | AK branding wrong | Copy not verified against spec | Fix headline string | COPY_SPEC.md + qa.sh string assert |

---

## Immediate Actions (Priority Order)

1. **TODAY:** Fix all 6 bugs — they are live and user-facing
2. **TODAY:** Enable `"strict": true` in all tsconfig files
3. **TODAY:** Set `react-hooks/exhaustive-deps` to `error` in ESLint config
4. **THIS WEEK:** Write Playwright E2E tests for Settings form, AK chat send, Voice onboarding Steps 1–3, Web audit trigger
5. **THIS WEEK:** Create `COPY_SPEC.md` with canonical strings for homepage, branding, CTAs
6. **THIS WEEK:** Update pre-push hook to run type-check + lint before allowing push

---

*Retrospective authored by: Platform Agent / CTO / Creative Director — MM (AKAI)*  
*This document is permanent. Do not delete. Update it when the gate evolves.*
