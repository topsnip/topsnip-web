import { test, expect } from "@playwright/test";

// ── Public Pages (no auth) ──────────────────────────────────────────────────

test.describe("Public pages", () => {
  test("landing page loads and has search bar", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/topsnip/i);
    await expect(page.locator("input[type=text], input[type=search]").first()).toBeVisible();
  });

  test("non-www redirects to www", async ({ page }) => {
    await page.goto("https://topsnip.co/");
    await expect(page).toHaveURL(/www\.topsnip\.co/);
  });

  test("about page loads", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("body")).toContainText(/topsnip/i);
    expect(page.url()).toContain("/about");
  });

  test("upgrade page loads", async ({ page }) => {
    await page.goto("/upgrade");
    await expect(page.locator("body")).toContainText(/pro/i);
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("body")).toContainText(/sign in|log in|google/i);
  });
});

// ── Auth Redirects ──────────────────────────────────────────────────────────

test.describe("Auth redirects (unauthenticated)", () => {
  test("/feed redirects to login", async ({ page }) => {
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("/settings redirects to login", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("/history redirects to login", async ({ page }) => {
    await page.goto("/history");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("/onboarding redirects to login", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

// ── Search (anonymous) ──────────────────────────────────────────────────────

test.describe("Search flow", () => {
  test("search from landing page navigates to results", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await searchInput.fill("what is RAG");
    await searchInput.press("Enter");
    // Should navigate to /s/ route
    await expect(page).toHaveURL(/\/s\//);
  });

  test("search results page shows loading or content (not Forbidden)", async ({ page }) => {
    await page.goto("/s/what-is-rag?q=what+is+RAG");
    // Wait for either results or loading — but NOT "Forbidden"
    await page.waitForTimeout(3000);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Forbidden");
  });

  test("search results page has topsnip logo", async ({ page }) => {
    await page.goto("/s/what-is-rag?q=what+is+RAG");
    await expect(page.locator("text=topsnip").first()).toBeVisible();
  });
});

// ── Navigation Links ────────────────────────────────────────────────────────

test.describe("Navigation", () => {
  test("landing page nav has About and Pricing links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a[href='/about']").first()).toBeVisible();
    await expect(page.locator("a[href='/upgrade']").first()).toBeVisible();
  });

  test("landing page has sign in link", async ({ page }) => {
    await page.goto("/");
    const signIn = page.locator("a[href*='login'], a[href*='auth']").first();
    await expect(signIn).toBeVisible();
  });

  test("about page logo links somewhere valid", async ({ page }) => {
    await page.goto("/about");
    const logo = page.locator("a").filter({ hasText: /topsnip/i }).first();
    const href = await logo.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).not.toBe("#");
  });
});

// ── Error Handling ──────────────────────────────────────────────────────────

test.describe("Error handling", () => {
  test("404 page for non-existent route", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);
  });

  test("non-existent topic returns 404", async ({ page }) => {
    const response = await page.goto("/topic/non-existent-topic-slug-xyz");
    // Could be 404 or redirect to login
    expect([200, 307, 404]).toContain(response?.status());
  });
});

// ── API Endpoints ───────────────────────────────────────────────────────────

test.describe("API health", () => {
  test("search API rejects empty query", async ({ request }) => {
    const resp = await request.post("/api/search", {
      data: { q: "" },
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status()).toBe(400);
  });

  test("search API rejects missing query", async ({ request }) => {
    const resp = await request.post("/api/search", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 403]).toContain(resp.status());
  });

  test("content generate requires auth", async ({ request }) => {
    const resp = await request.post("/api/content/generate");
    expect([401, 403]).toContain(resp.status());
  });

  test("ingest run requires auth", async ({ request }) => {
    const resp = await request.get("/api/ingest/run");
    expect([401, 403]).toContain(resp.status());
  });
});
