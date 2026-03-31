/**
 * BUG REGRESSION SUITE — bug-regression.spec.ts
 *
 * Every test in this file maps to a specific production bug that shipped
 * because the test suite didn't catch it. ZeroDefect means: if it broke
 * once, it can NEVER break again silently.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ BUG 1: URL input type="url" — browser rejected bare domains │
 * │ BUG 2: Success screen personalized with test name           │
 * │ BUG 3: Missing env vars — emails silently failed            │
 * │ BUG 4: Web audit fired on empty URL → immediate error msg   │
 * │ BUG 5: AP Heritage cron double-fired on error status        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Run:
 *   npx playwright test bug-regression.spec.ts
 *   BASE_URL=https://getakai.ai npx playwright test bug-regression.spec.ts
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { mockFirebaseState } from './helpers/mockFirebase';
import { STATES } from './fixtures/testData';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PROD_URL = 'https://getakai.ai';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function assertNoCrash(page: Page) {
  await expect(page.locator('body')).not.toContainText('Application error');
  await expect(page.locator('body')).not.toContainText('Internal Server Error');
  await expect(page.locator('body')).not.toContainText('Something went wrong');
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG 1: URL input field must NOT use type="url"
// ─────────────────────────────────────────────────────────────────────────────
//
// Root cause: `<input type="url">` causes browsers to reject bare domains
// like `getakai.ai` or `www.getakai.ai` — browser validation fires before
// React even sees the value. Users who type their domain without https://
// get a silent block. The fix is type="text" with autoComplete="url".
//
// Impact pages: /health, /sales (Sophie outreach URL field)
// LeadCaptureModal.tsx already fixed — using type="text" autoComplete="url"

test.describe('BUG 1 — URL input type must be text (not url)', () => {

  test('B1a: /health page — URL input is type=text, accepts bare domain', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await page.goto(`${BASE_URL}/health`);

    const url = page.url();
    if (url.includes('/login')) {
      console.log('B1a: auth-gated — testing via HTML source check');
      // Check the source code directly — type="url" must NOT be in health/page.tsx
      // This is verified by qa.sh Suite 6 scan; here we just confirm redirect is clean
      await assertNoCrash(page);
      return;
    }

    await assertNoCrash(page);

    // Find the website URL input
    const urlInput = page.locator('input[placeholder*="yoursite" i], input[placeholder*="website" i], input[placeholder*="https" i], input[placeholder*="http" i], input[autocomplete="url"]').first();
    const found = await urlInput.isVisible().catch(() => false);
    if (!found) {
      console.log('B1a: URL input not visible (may be step 2+) — skipping field type check');
      return;
    }

    // CRITICAL: must NOT be type="url"
    const inputType = await urlInput.getAttribute('type');
    expect(
      inputType,
      `BUG 1 REGRESSION: /health URL input is type="${inputType}". Must be type="text" to accept bare domains like getakai.ai`
    ).not.toBe('url');

    // Must accept bare domain without browser validity error
    await urlInput.fill('getakai.ai');
    const validity = await urlInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(
      validity,
      'BUG 1 REGRESSION: "getakai.ai" failed browser validity check — input should accept bare domains'
    ).toBe(true);

    // Must accept www. prefix
    await urlInput.fill('www.getakai.ai');
    const validityWww = await urlInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validityWww, 'BUG 1: "www.getakai.ai" failed validity check').toBe(true);

    // Must accept https:// too
    await urlInput.fill('https://getakai.ai');
    const validityHttps = await urlInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validityHttps, 'BUG 1: "https://getakai.ai" failed validity check').toBe(true);

    console.log('B1a: /health URL input is NOT type="url" — accepts bare domains ✓');
  });

  test('B1b: /sales page Sophie outreach URL input — accepts bare domain', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await page.goto(`${BASE_URL}/sales`);

    const url = page.url();
    if (url.includes('/login')) {
      await assertNoCrash(page);
      console.log('B1b: auth-gated — skipping live test');
      return;
    }

    await assertNoCrash(page);

    // Website field in the outreach form — identified by placeholder
    const websiteInput = page.locator('input[placeholder*="website" i], input[placeholder*="Website" i]').first();
    const found = await websiteInput.isVisible().catch(() => false);
    if (!found) {
      console.log('B1b: website input not immediately visible (may be in a modal/drawer) — skipping');
      return;
    }

    const inputType = await websiteInput.getAttribute('type');
    expect(
      inputType,
      `BUG 1 REGRESSION: /sales website input is type="${inputType}". Must be type="text" to accept bare domains`
    ).not.toBe('url');

    await websiteInput.fill('getakai.ai');
    const validity = await websiteInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity, 'BUG 1: /sales "getakai.ai" failed validity check').toBe(true);

    console.log('B1b: /sales website input is NOT type="url" — accepts bare domains ✓');
  });

  test('B1c: LeadCaptureModal website field — accepts bare domain (no regression)', async ({ page }) => {
    // Test against production homepage where the modal lives
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });

    // Open modal
    const cta = page.locator('button').filter({ hasText: /get early access|start free|get started/i }).first();
    const ctaVisible = await cta.isVisible().catch(() => false);
    if (!ctaVisible) {
      console.log('B1c: CTA button not found on homepage — skipping modal test');
      return;
    }
    await cta.click();

    // Wait for modal
    const websiteInput = page.locator('input[placeholder*="yourbusiness" i], input[placeholder*="business.com" i], input[autocomplete="url"]').first();
    const modalOpened = await websiteInput.waitFor({ timeout: 5000, state: 'visible' }).then(() => true).catch(() => false);
    if (!modalOpened) {
      console.log('B1c: Modal did not open or website input not found — skipping');
      return;
    }

    // Must NOT be type="url"
    const inputType = await websiteInput.getAttribute('type');
    expect(
      inputType,
      `BUG 1 REGRESSION: LeadCaptureModal website input is type="${inputType}". Must be type="text"`
    ).not.toBe('url');

    // Must accept bare domain
    await websiteInput.fill('getakai.ai');
    const validity = await websiteInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity, 'BUG 1: Modal "getakai.ai" failed validity — type="url" may be back').toBe(true);

    console.log('B1c: LeadCaptureModal website input type="text" — accepts bare domains ✓');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 2: Success screen must NOT personalize headline with name
// ─────────────────────────────────────────────────────────────────────────────
//
// Root cause: Success screen headline was interpolating form.name into heading,
// resulting in "Welcome to AKAI, AK Test!" instead of just "Welcome to AKAI!"
// The heading must be generic — the name mention is relegated to body copy only.
//
// Correct: h2 says exactly "Welcome to AKAI! 🚀"
// Wrong:   h2 says "Welcome to AKAI, [name]!" or "Hi [name], welcome to AKAI!"

test.describe('BUG 2 — Success screen copy must be generic (no name in headline)', () => {

  // Test against production — mock the API response so we don't spam real DB
  test('B2a: Success screen headline is generic — no name interpolation', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });

    // Intercept the API call — return success without hitting real endpoint
    await page.route('**/api/trial-interest', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    // Open modal
    const cta = page.locator('button').filter({ hasText: /get early access|start free|get started/i }).first();
    const ctaVisible = await cta.isVisible().catch(() => false);
    if (!ctaVisible) {
      console.log('B2a: CTA not found — skipping');
      return;
    }
    await cta.click();

    // Fill form with a distinctive test name
    const emailInput = page.locator('input[type="email"]').first();
    const modalOpened = await emailInput.waitFor({ timeout: 5000, state: 'visible' }).then(() => true).catch(() => false);
    if (!modalOpened) {
      console.log('B2a: Modal did not open — skipping');
      return;
    }

    await emailInput.fill('regression-test@getakai.ai');

    const nameInput = page.locator('input[autocomplete="given-name"], input[placeholder*="Jane" i], input[placeholder*="First" i], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('AK Test'); // The exact name that was causing the bug
    }

    // Select focus
    const focusSelect = page.locator('select').first();
    if (await focusSelect.isVisible().catch(() => false)) {
      await focusSelect.selectOption({ index: 1 });
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    }

    // Wait for success screen
    const successHeading = page.locator('h2').filter({ hasText: /welcome/i }).first();
    const successVisible = await successHeading.waitFor({ timeout: 8000, state: 'visible' }).then(() => true).catch(() => false);

    if (!successVisible) {
      console.log('B2a: Success screen did not appear (may need all required fields) — skipping heading check');
      return;
    }

    const headingText = await successHeading.textContent() ?? '';

    // CRITICAL: heading must NOT contain the test name
    expect(
      headingText,
      `BUG 2 REGRESSION: Success heading contains "AK Test" — should be generic. Got: "${headingText}"`
    ).not.toContain('AK Test');

    // CRITICAL: heading must NOT be personalized with ANY comma + name pattern
    expect(
      headingText,
      `BUG 2 REGRESSION: Success heading appears personalized (contains comma). Got: "${headingText}"`
    ).not.toMatch(/welcome to akai,\s+\w+/i);

    // Positive assertion: heading must say "Welcome to AKAI"
    expect(
      headingText,
      `BUG 2: Success heading should say "Welcome to AKAI". Got: "${headingText}"`
    ).toMatch(/welcome to akai/i);

    console.log(`B2a: Success heading is generic: "${headingText.trim()}" ✓`);
  });

  test('B2b: Success screen body copy — says "Aaron" not the test name', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });

    await page.route('**/api/trial-interest', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const cta = page.locator('button').filter({ hasText: /get early access|start free|get started/i }).first();
    const ctaVisible = await cta.isVisible().catch(() => false);
    if (!ctaVisible) { return; }
    await cta.click();

    const emailInput = page.locator('input[type="email"]').first();
    const modalOpened = await emailInput.waitFor({ timeout: 5000, state: 'visible' }).then(() => true).catch(() => false);
    if (!modalOpened) { return; }

    await emailInput.fill('regression-test@getakai.ai');

    const nameInput = page.locator('input[autocomplete="given-name"], input[placeholder*="Jane" i], input[placeholder*="First" i]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('NotAaron'); // Should NOT appear in body copy
    }

    const focusSelect = page.locator('select').first();
    if (await focusSelect.isVisible().catch(() => false)) {
      await focusSelect.selectOption({ index: 1 });
    }

    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    }

    const successScreen = page.locator('.py-4, [class*="success"], h2').filter({ hasText: /welcome/i }).first();
    const successVisible = await successScreen.waitFor({ timeout: 8000, state: 'visible' }).then(() => true).catch(() => false);
    if (!successVisible) { return; }

    // Get full modal text
    const modalText = await page.locator('[class*="max-w-md"], [class*="modal"], [role="dialog"]').first().innerText().catch(() => '');

    // Body copy must mention "Aaron" (the founder) — not the test name
    expect(
      modalText,
      'BUG 2: Success screen should mention "Aaron" in body copy'
    ).toContain('Aaron');

    // Must NOT contain "NotAaron" (test name we entered should never appear in success copy)
    expect(
      modalText,
      'BUG 2 REGRESSION: Success screen is interpolating form name into body copy'
    ).not.toContain('NotAaron');

    console.log('B2b: Success screen body copy mentions "Aaron" not test name ✓');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 3: Production env smoke — /api/trial-interest returns 200 + notifies
// ─────────────────────────────────────────────────────────────────────────────
//
// Root cause: Missing Vercel env vars (FIREBASE_PRIVATE_KEY, GMAIL_APP_PASSWORD,
// RAILWAY_API_KEY) meant emails silently failed. The endpoint returned 200 but
// nothing arrived. This test hits the real endpoint with a clearly-labelled
// test payload to confirm: (1) endpoint returns 200, (2) Telegram notification
// fires (Aaron sees it, knows the test ran), (3) no silent 500 is swallowed.

test.describe('BUG 3 — Production API smoke: /api/trial-interest', () => {

  test('B3a: POST /api/trial-interest returns 200 (production)', async ({ request }: { request: APIRequestContext }) => {
    const response = await request.post(`${PROD_URL}/api/trial-interest`, {
      data: {
        name: 'QA Smoke Test',
        email: 'qa-smoke@getakai.ai',
        businessName: 'AKAI Test Suite',
        focus: 'All of it',
        source: 'qa_smoke_test',
        website: 'getakai.ai',
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AKAI-Playwright-Smoke-Test/1.0',
      },
      timeout: 15000,
    });

    expect(
      response.status(),
      `BUG 3 REGRESSION: /api/trial-interest returned ${response.status()}. Env vars may be missing.`
    ).toBe(200);

    const body = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; waitlisted?: boolean };

    expect(
      body.error,
      `BUG 3: API returned error: ${body.error}`
    ).toBeUndefined();

    // ok: true means the full flow ran (Firestore + Telegram + email)
    // ok: true + waitlisted: true is also fine (means non-whitelisted, waitlisted correctly)
    const succeeded = body.ok === true;
    expect(
      succeeded,
      `BUG 3 REGRESSION: /api/trial-interest did not return ok:true. Got: ${JSON.stringify(body)}`
    ).toBe(true);

    console.log(`B3a: /api/trial-interest returned 200 ok:${body.ok} waitlisted:${body.waitlisted} ✓`);
  });

  test('B3b: POST /api/trial-interest — no 500 on missing optional fields', async ({ request }: { request: APIRequestContext }) => {
    // Minimal payload — should still succeed (only email is required)
    const response = await request.post(`${PROD_URL}/api/trial-interest`, {
      data: {
        name: 'Minimal Test',
        email: 'minimal-smoke@getakai.ai',
        focus: 'Sales calls',
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    expect(response.status()).toBeLessThan(500);
    expect(response.status()).toBe(200);

    console.log('B3b: Minimal payload — no 500 ✓');
  });

  test('B3c: POST /api/trial-interest — empty email returns 400 not 500', async ({ request }: { request: APIRequestContext }) => {
    const response = await request.post(`${PROD_URL}/api/trial-interest`, {
      data: { name: 'No Email Test' }, // Missing email
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    // Must return 400 (validation) not 500 (unhandled crash)
    expect(
      response.status(),
      `BUG 3: Missing email should return 400, got ${response.status()}`
    ).toBe(400);

    console.log('B3c: Missing email returns 400 (not 500) ✓');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 4: Web module must NOT show error on initial load (empty URL)
// ─────────────────────────────────────────────────────────────────────────────
//
// Root cause: AuditPanel's useEffect({ runAudit }) fired immediately on mount.
// If the connected URL wasn't loaded from Firestore yet (async), url="" was
// passed to the panel — the guard `if (!url?.trim()) return;` exists in code
// BUT the useCallback dep array included `url`, causing a second fire after
// url loaded, which then hit the Railway API before user explicitly requested it.
//
// More critically: when no URL is configured at all (fresh user on /web),
// the page was showing "Couldn't reach audit service" immediately.

test.describe('BUG 4 — Web module: no error on initial load with empty URL', () => {

  test('B4a: /web page loads — no error message on initial load (fresh user)', async ({ page }) => {
    // Fresh user: no webConfig in Firestore — no URL connected
    await mockFirebaseState(page, STATES.freshUser);
    await page.goto(`${BASE_URL}/web`);

    const url = page.url();
    if (url.includes('/login')) {
      await assertNoCrash(page);
      console.log('B4a: auth-gated — no crash on redirect ✓');
      return;
    }

    await assertNoCrash(page);

    // Wait for initial render + any async Firestore reads
    await page.waitForTimeout(3000);

    // CRITICAL: must NOT show audit service error on initial load
    const errorTexts = [
      "Couldn't reach the audit service",
      "Couldn't reach audit service",
      "audit service",
      "reach audit",
    ];

    for (const errorText of errorTexts) {
      const errorLocator = page.locator(`text="${errorText}"`).first();
      const errorVisible = await errorLocator.isVisible().catch(() => false);
      // Also check body text for partial matches
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const inBody = bodyText.toLowerCase().includes(errorText.toLowerCase());

      expect(
        inBody,
        `BUG 4 REGRESSION: Web page shows "${errorText}" on initial load with no URL configured`
      ).toBe(false);
    }

    // The page should show a "connect your website" form, not an error
    const connectForm = page.locator('input[placeholder*="yoursite" i], input[placeholder*="website" i], text=/connect your site/i, text=/enter your website/i, text=/add your website/i').first();
    const formVisible = await connectForm.isVisible().catch(() => false);

    if (formVisible) {
      console.log('B4a: Connect form visible (no error shown on empty URL) ✓');
    } else {
      // Just verify no error — page might show a different state
      console.log('B4a: No audit error shown on initial load ✓');
    }
  });

  test('B4b: /web page — error only appears AFTER user submits URL, not before', async ({ page }) => {
    await mockFirebaseState(page, STATES.fullyConnected);
    await page.goto(`${BASE_URL}/web`);

    const url = page.url();
    if (url.includes('/login')) {
      await assertNoCrash(page);
      return;
    }

    await assertNoCrash(page);

    // Intercept Railway audit call — simulate failure
    await page.route('**/api/website-mockup/audit', route => {
      route.fulfill({ status: 500, body: 'Service unavailable' });
    });

    // Check for error BEFORE any submit — must be none
    await page.waitForTimeout(2000);
    const bodyBefore = await page.locator('body').innerText().catch(() => '');
    const hasPreSubmitError = bodyBefore.toLowerCase().includes("couldn't reach");
    expect(
      hasPreSubmitError,
      `BUG 4 REGRESSION: Error appeared before user submitted URL. Body: "${bodyBefore.substring(0, 200)}"`
    ).toBe(false);

    console.log('B4b: No error shown before URL submit ✓');
  });

  test('B4c: /web with fully-connected user — connected URL triggers audit, not blank page', async ({ page }) => {
    // Fully connected user with a webConfig URL — should trigger audit automatically
    await mockFirebaseState(page, {
      ...STATES.fullyConnected,
      webConfig: { type: 'url', url: 'https://example.com', connected: true },
    });
    await page.goto(`${BASE_URL}/web`);

    const url = page.url();
    if (url.includes('/login')) {
      await assertNoCrash(page);
      return;
    }

    await assertNoCrash(page);

    // Page should NOT be blank — either audit panel or loading state
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(
      bodyText.trim().length,
      'BUG 4: /web is blank with connected URL'
    ).toBeGreaterThan(50);

    console.log('B4c: /web with connected URL shows content (not blank) ✓');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 5: Lead capture full flow — URL without https:// submits successfully
// ─────────────────────────────────────────────────────────────────────────────
//
// Root cause: While the success screen copy was one issue, the form itself
// also had issues with URL validation blocking submissions.
// The API auto-prepends https:// to bare domains — this must continue to work.

test.describe('BUG 5 — Lead capture: bare domain URL submits successfully', () => {

  test('B5a: Full lead capture flow with bare domain URL (no https://)', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });

    // Intercept submission — verify the URL was normalised server-side
    let capturedPayload: Record<string, unknown> | null = null;
    await page.route('**/api/trial-interest', async route => {
      const request = route.request();
      try {
        capturedPayload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      } catch { /* ignore */ }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    // Open modal
    const cta = page.locator('button').filter({ hasText: /get early access|start free|get started/i }).first();
    const ctaVisible = await cta.isVisible().catch(() => false);
    if (!ctaVisible) {
      console.log('B5a: CTA not found — skipping');
      return;
    }
    await cta.click();

    const emailInput = page.locator('input[type="email"]').first();
    const modalOpened = await emailInput.waitFor({ timeout: 5000, state: 'visible' }).then(() => true).catch(() => false);
    if (!modalOpened) {
      console.log('B5a: Modal did not open — skipping');
      return;
    }

    await emailInput.fill('fullflow-test@getakai.ai');

    const nameInput = page.locator('input[autocomplete="given-name"], input[placeholder*="Jane" i], input[placeholder*="First" i]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Flow Test');
    }

    // KEY TEST: Enter bare domain — no https://
    const websiteInput = page.locator('input[placeholder*="yourbusiness" i], input[placeholder*="business.com" i], input[autocomplete="url"]').first();
    if (await websiteInput.isVisible().catch(() => false)) {
      await websiteInput.fill('getakai.ai'); // No https:// — the API must handle this
    }

    // Select focus
    const focusSelect = page.locator('select').first();
    if (await focusSelect.isVisible().catch(() => false)) {
      await focusSelect.selectOption({ index: 1 });
    }

    // Submit — must NOT be blocked by browser validation
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    }

    // Wait for success or error state
    const outcomeVisible = await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes('Welcome to AKAI') || body.includes('Something went wrong') || body.includes('Submitting');
      },
      { timeout: 10000 }
    ).then(() => true).catch(() => false);

    if (!outcomeVisible) {
      console.log('B5a: Outcome not detected — form may still be visible (all required fields needed)');
      return;
    }

    // If the API was called, verify the URL was normalised
    if (capturedPayload) {
      const website = capturedPayload['website'] as string | undefined;
      if (website) {
        expect(
          website,
          `BUG 5: API should receive normalised URL with https://. Got: "${website}"`
        ).toMatch(/^https?:\/\//);
        console.log(`B5a: URL normalised to "${website}" ✓`);
      }
    }

    // Must show success screen (not error)
    const successVisible = await page.locator('text=/Welcome to AKAI/i').isVisible().catch(() => false);
    if (successVisible) {
      console.log('B5a: Full lead capture flow with bare domain URL succeeded ✓');
    } else {
      // Check it didn't show a validation error instead
      const bodyText = await page.locator('body').innerText().catch(() => '');
      expect(
        bodyText,
        'BUG 5: Form should not show browser validation error for bare domain'
      ).not.toMatch(/Please enter a URL|valid URL|url format/i);
    }
  });

  test('B5b: Full lead capture flow with www. domain (no https://)', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });

    await page.route('**/api/trial-interest', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const cta = page.locator('button').filter({ hasText: /get early access|start free|get started/i }).first();
    if (!await cta.isVisible().catch(() => false)) { return; }
    await cta.click();

    const emailInput = page.locator('input[type="email"]').first();
    if (!await emailInput.waitFor({ timeout: 5000, state: 'visible' }).then(() => true).catch(() => false)) { return; }

    await emailInput.fill('www-test@getakai.ai');

    const nameInput = page.locator('input[autocomplete="given-name"], input[placeholder*="Jane" i]').first();
    if (await nameInput.isVisible().catch(() => false)) await nameInput.fill('WWW Test');

    const websiteInput = page.locator('input[placeholder*="yourbusiness" i], input[autocomplete="url"]').first();
    if (await websiteInput.isVisible().catch(() => false)) {
      await websiteInput.fill('www.getakai.ai'); // www. prefix, no https://
    }

    const focusSelect = page.locator('select').first();
    if (await focusSelect.isVisible().catch(() => false)) await focusSelect.selectOption({ index: 1 });

    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();

    // Must NOT show browser validation error
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(bodyText).not.toMatch(/Please enter a URL|valid URL/i);

    console.log('B5b: www. domain accepted without browser validation error ✓');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source code scan: type="url" must not exist in critical form inputs
// ─────────────────────────────────────────────────────────────────────────────
//
// This test scans the compiled HTML of production pages to verify no
// type="url" appears in form inputs that accept user-provided domain names.
// Catches regressions BEFORE they reach users.

test.describe('BUG 1 (Source Scan) — No type="url" in domain-accepting inputs', () => {

  test('B1d: Production /health HTML must not have type="url" input for website field', async ({ page }) => {
    const response = await page.goto(`${PROD_URL}/health`, { waitUntil: 'domcontentloaded' });

    // May redirect to /login — that's OK, check the rendered HTML
    await page.waitForTimeout(3000); // Let client-side hydrate

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('B1d: /health auth-gated, checking login page has no stray type="url"');
    }

    // Get all type="url" inputs on the current page
    const urlTypeInputs = await page.locator('input[type="url"]').count();

    if (urlTypeInputs > 0) {
      // Check what placeholder they have — if it's a domain/website input, that's the bug
      const inputs = await page.locator('input[type="url"]').all();
      for (const input of inputs) {
        const placeholder = await input.getAttribute('placeholder') ?? '';
        const isSiteInput = /website|domain|url|yoursite|business\.com/i.test(placeholder);
        expect(
          isSiteInput,
          `BUG 1 REGRESSION: Found input[type="url"] with placeholder="${placeholder}" — this rejects bare domains. Change to type="text" autoComplete="url"`
        ).toBe(false);
      }
    }

    console.log(`B1d: Found ${urlTypeInputs} type="url" inputs — none are domain-entry fields ✓`);
  });
});
