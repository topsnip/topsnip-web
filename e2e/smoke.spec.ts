import { test, expect } from "@playwright/test";

// ── Feed Page ──────────────────────────────────────────────────────────────

test.describe("Feed page", () => {
  test("root redirects to /feed", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/feed/);
  });

  test("feed page loads with TopSnip header", async ({ page }) => {
    await page.goto("/feed");
    await expect(page).toHaveTitle(/topsnip/i);
    await expect(page.locator("text=TopSnip").first()).toBeVisible();
  });

  test("feed page shows cards or empty state", async ({ page }) => {
    await page.goto("/feed");
    // Either shows cards or the empty state message
    const body = page.locator("body");
    await expect(body).toContainText(/No topics yet today|sources?/i);
  });
});

// ── Learn Page ─────────────────────────────────────────────────────────────

test.describe("Learn page", () => {
  test("non-existent topic returns 404", async ({ page }) => {
    const response = await page.goto("/learn/non-existent-topic-slug-xyz");
    expect(response?.status()).toBe(404);
  });
});

// ── API Endpoints ──────────────────────────────────────────────────────────

test.describe("API health", () => {
  test("feed API returns JSON with topics array", async ({ request }) => {
    const resp = await request.get("/api/feed");
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data).toHaveProperty("topics");
    expect(Array.isArray(data.topics)).toBe(true);
  });

  test("feed API supports date parameter", async ({ request }) => {
    const resp = await request.get("/api/feed?date=2026-04-09&limit=5");
    expect(resp.status()).toBe(200);
    const data = await resp.json();
    expect(data).toHaveProperty("has_more");
  });

  test("learn API returns 404 for non-existent slug", async ({ request }) => {
    const resp = await request.get("/api/learn/non-existent-slug");
    expect(resp.status()).toBe(404);
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

// ── Error Handling ─────────────────────────────────────────────────────────

test.describe("Error handling", () => {
  test("404 page for non-existent route", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);
  });
});
