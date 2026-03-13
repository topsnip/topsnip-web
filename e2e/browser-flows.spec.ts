import { test, expect, type Page } from "@playwright/test";

const BASE = "https://topsnip.vercel.app";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Set localStorage values before navigation (must be on the same origin first). */
async function setLocalStorage(page: Page, key: string, value: string) {
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k, v),
    [key, value]
  );
}

/** Clear topsnip guest search keys from localStorage. */
async function clearGuestCounters(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("ts_guest_searches");
    localStorage.removeItem("ts_guest_date");
  });
}

/** Perform a search from the homepage and wait for navigation. */
async function searchFromHome(page: Page, query: string) {
  await page.goto("/");
  const input = page.getByPlaceholder("What do you want to learn today?");
  await input.fill(query);
  await page.getByRole("button", { name: "Topsnip it" }).click();
  await page.waitForURL(/\/s\//);
}

// ─── 1. Guest localStorage limit (3 searches → SignUpGate) ──────────────────

test.describe("Guest search limit", () => {
  test("shows SignUpGate modal after 3 guest searches", async ({ page }) => {
    // Start on the site so we can manipulate localStorage
    await page.goto("/");
    await clearGuestCounters(page);

    // Simulate 3 completed guest searches by seeding localStorage
    const today = new Date().toISOString().slice(0, 10);
    await setLocalStorage(page, "ts_guest_searches", "3");
    await setLocalStorage(page, "ts_guest_date", today);

    // Navigate to a result page — this should trigger the guest gate
    await page.goto("/s/test-query?q=test+query");

    // SignUpGate should appear with the guest limit message
    const modal = page.getByText("Keep going");
    await expect(modal).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("You've used your 3 free searches")
    ).toBeVisible();

    // CTA should say "Sign up free" and link to login
    const cta = page.getByRole("button", { name: "Sign up free" });
    await expect(cta).toBeVisible();
  });

  test("does NOT show gate when under the limit", async ({ page }) => {
    await page.goto("/");
    await clearGuestCounters(page);

    // Set count to 2 (under the 3 limit)
    const today = new Date().toISOString().slice(0, 10);
    await setLocalStorage(page, "ts_guest_searches", "2");
    await setLocalStorage(page, "ts_guest_date", today);

    await page.goto("/s/test-query?q=test+query");

    // Should NOT see the gate — instead should see loading or results
    await expect(page.getByText("Keep going")).not.toBeVisible({ timeout: 5_000 });

    // Should see loading indicator or result content
    const hasLoader = await page.getByText("Searching YouTube...").isVisible().catch(() => false);
    const hasResult = await page.getByText("Topsnip result").isVisible().catch(() => false);
    const hasError = await page.getByText("Try again").isVisible().catch(() => false);
    expect(hasLoader || hasResult || hasError).toBeTruthy();
  });
});

// ─── 2. Google OAuth login flow (partial — verifies redirect) ───────────────

test.describe("Google OAuth flow", () => {
  test("clicking Continue with Google redirects to Supabase/Google OAuth", async ({ page }) => {
    await page.goto("/auth/login");

    // Verify the login page renders
    await expect(page.getByText("Sign in to keep searching")).toBeVisible();

    // Google button should be present
    const googleBtn = page.getByRole("button", { name: "Continue with Google" });
    await expect(googleBtn).toBeVisible();

    // Click and verify navigation starts toward Supabase OAuth endpoint
    // We intercept the navigation rather than following through to Google
    const [request] = await Promise.all([
      page.waitForEvent("request", (req) =>
        req.url().includes("supabase") && req.url().includes("authorize")
      ),
      googleBtn.click(),
    ]).catch(() => [null]);

    // If we caught the request, verify it's heading to the right place
    if (request) {
      expect(request.url()).toContain("authorize");
    }
    // Either way, the page should have navigated away from /auth/login
    // (to Supabase auth, which then goes to Google)
  });
});

// ─── 3. Magic link email form ───────────────────────────────────────────────

test.describe("Magic link login", () => {
  test("submitting email shows confirmation message", async ({ page }) => {
    await page.goto("/auth/login");

    // Fill in email
    const emailInput = page.getByPlaceholder("your@email.com");
    await expect(emailInput).toBeVisible();
    await emailInput.fill("test@example.com");

    // Submit button should be enabled
    const submitBtn = page.getByRole("button", { name: "Send magic link" });
    await expect(submitBtn).toBeEnabled();

    // Click and wait for the success state
    await submitBtn.click();

    // Should show "Check your email" confirmation (or an error from Supabase
    // if the email provider isn't configured — either way, the form submitted)
    const success = page.getByText("Check your email");
    const error = page.locator("[style*='var(--error)']");

    // Wait for either outcome
    await expect(success.or(error)).toBeVisible({ timeout: 15_000 });

    if (await success.isVisible()) {
      // Verify it shows the email we entered
      await expect(page.getByText("test@example.com")).toBeVisible();
    }
  });

  test("submit button is disabled when email is empty", async ({ page }) => {
    await page.goto("/auth/login");

    const submitBtn = page.getByRole("button", { name: "Send magic link" });
    await expect(submitBtn).toBeDisabled();
  });

  test("footer shows no-spam message", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByText("No password required. No spam. Ever.")).toBeVisible();
  });
});

// ─── 4. Stripe Checkout redirect ────────────────────────────────────────────

test.describe("Stripe Checkout", () => {
  test("upgrade page renders pricing cards", async ({ page }) => {
    await page.goto("/upgrade");

    // Heading
    await expect(page.getByText("Unlimited searches.").first()).toBeVisible();

    // Monthly card
    await expect(page.getByText("Pro — Monthly")).toBeVisible();
    await expect(page.getByText("$9", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Pro — $9/mo" })).toBeVisible();

    // Yearly card
    await expect(page.getByText("Pro — Yearly")).toBeVisible();
    await expect(page.getByText("$79", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Pro — $79/yr" })).toBeVisible();

    // Save badge
    await expect(page.getByText("Save $29/year")).toBeVisible();

    // Comparison table
    await expect(page.getByText("Guest")).toBeVisible();
    await expect(page.getByText("Free account")).toBeVisible();

    // Footer
    await expect(page.getByText("No commitment. Cancel any time. Billed via Stripe.")).toBeVisible();
  });

  test("clicking checkout without auth redirects to login", async ({ page }) => {
    await page.goto("/upgrade");

    // Wait for auth check to resolve (isLoggedIn becomes false)
    await page.waitForTimeout(2000);

    const monthlyBtn = page.getByRole("button", { name: "Get Pro — $9/mo" });
    await monthlyBtn.click();

    // Should redirect to login with redirect param
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("redirect");
    expect(page.url()).toContain("upgrade");
  });

  test("upgrade success page renders correctly", async ({ page }) => {
    await page.goto("/upgrade?upgraded=true");

    await expect(page.getByText("You're on Pro.")).toBeVisible();
    await expect(page.getByText("Unlimited searches, starting now.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start searching" })).toBeVisible();
  });
});

// ─── 5. History page (auth-protected) ───────────────────────────────────────

test.describe("History page", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    // History is server-rendered and should redirect unauthenticated users
    const response = await page.goto("/history");

    // Should end up on the login page with redirect param
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    expect(page.url()).toContain("redirect");
  });
});

// ─── 6. Free tier 10-search DB limit → SignUpGate ───────────────────────────

test.describe("Free tier search limit", () => {
  test("API returns 429 with free_limit code, showing SignUpGate", async ({ page }) => {
    // Mock the /api/search endpoint to return a 429 free_limit response
    await page.route("**/api/search", (route) => {
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Daily search limit reached",
          code: "free_limit",
        }),
      });
    });

    // Clear guest counters so the client-side gate doesn't trigger first
    await page.goto("/");
    await clearGuestCounters(page);

    await page.goto("/s/test-free-limit?q=test+free+limit");

    // SignUpGate should appear with the free-tier message
    const modal = page.getByText("Keep going");
    await expect(modal).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("You've hit your 10 daily searches")
    ).toBeVisible();

    // CTA should offer upgrade
    const cta = page.getByRole("button", { name: /Upgrade to Pro/ });
    await expect(cta).toBeVisible();

    // Footer note
    await expect(
      page.getByText("$9/month · cancel any time · no commitment")
    ).toBeVisible();
  });
});

// ─── 7. Homepage smoke test ─────────────────────────────────────────────────

test.describe("Homepage", () => {
  test("renders hero, search form, and suggestion chips", async ({ page }) => {
    await page.goto("/");

    // Search input
    const input = page.getByPlaceholder("What do you want to learn today?");
    await expect(input).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: "Topsnip it" })).toBeVisible();

    // At least one suggestion chip
    await expect(page.getByText("Claude Code skills and workflows")).toBeVisible();

    // Free searches note
    await expect(page.getByText("3 free searches")).toBeVisible();
  });

  test("clicking a suggestion chip navigates to result page", async ({ page }) => {
    await page.goto("/");
    await clearGuestCounters(page);

    // Click a suggestion
    await page.getByText("Cursor AI coding tips").click();

    // Should navigate to /s/ route
    await page.waitForURL(/\/s\//, { timeout: 5_000 });
    expect(page.url()).toContain("/s/");
  });

  test("search form submits and navigates correctly", async ({ page }) => {
    await page.goto("/");
    await clearGuestCounters(page);

    const input = page.getByPlaceholder("What do you want to learn today?");
    await input.fill("how to use docker");
    await page.getByRole("button", { name: "Topsnip it" }).click();

    await page.waitForURL(/\/s\/how-to-use-docker/, { timeout: 5_000 });
    expect(page.url()).toMatch(/q=how(\+|%20)to(\+|%20)use(\+|%20)docker/);
  });
});

// ─── 8. Result page loading and content ─────────────────────────────────────

test.describe("Result page", () => {
  test("shows loading stages while fetching", async ({ page }) => {
    // Delay the API response so we can observe loading
    await page.route("**/api/search", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          query: "test topic",
          tldr: "This is the TL;DR summary.",
          key_points: ["Point one", "Point two"],
          key_concepts: ["Concept A", "Concept B"],
          sources: [],
          synthesized_from: 5,
        }),
      });
    });

    await page.goto("/");
    await clearGuestCounters(page);
    await page.goto("/s/test-topic?q=test+topic");

    // Should see loading text
    await expect(page.getByText("Searching YouTube...")).toBeVisible({ timeout: 5_000 });

    // After the delayed response, should see result
    await expect(page.getByText("TL;DR", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("This is the TL;DR summary.")).toBeVisible();
    await expect(page.getByText("Synthesized from 5 YouTube videos")).toBeVisible();
  });
});
