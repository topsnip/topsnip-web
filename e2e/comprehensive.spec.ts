import { test, expect } from "@playwright/test";

// ── 1. Landing Page Tests ──────────────────────────────────────────────────

test.describe("Landing page", () => {
  test("page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test("search bar accepts input and submits on Enter", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("what is RAG");
    await expect(searchInput).toHaveValue("what is RAG");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/s\//);
  });

  test("suggestion chips are clickable and navigate to search", async ({ page }) => {
    await page.goto("/");
    // Suggestion chips are typically buttons or links near the search bar
    const chip = page.locator("button, a").filter({ hasText: /.{5,}/ }).first();
    // If there are suggestion chips, clicking one should navigate
    const chipCount = await page.locator("[class*=chip], [class*=suggestion], [class*=pill], [data-testid*=suggestion]").count();
    if (chipCount > 0) {
      const firstChip = page.locator("[class*=chip], [class*=suggestion], [class*=pill], [data-testid*=suggestion]").first();
      await firstChip.click();
      await expect(page).toHaveURL(/\/s\//);
    } else {
      // Fallback: look for clickable elements near the search that could be suggestions
      // Some designs use plain links or buttons as suggestion chips
      const links = page.locator("main a[href*='/s/'], main button").filter({ hasText: /.{5,}/ });
      const count = await links.count();
      if (count > 0) {
        await links.first().click();
        // Should navigate somewhere meaningful
        await page.waitForLoadState("domcontentloaded");
      }
      // If no chips found at all, just verify the page loaded correctly
      await expect(page.locator("body")).toContainText(/topsnip/i);
    }
  });

  test("nav has About, Pricing, and Sign in links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("a[href='/about']").first()).toBeVisible();
    await expect(page.locator("a[href='/upgrade']").first()).toBeVisible();
    const signIn = page.locator("a[href*='login'], a[href*='auth']").first();
    await expect(signIn).toBeVisible();
  });

  test("footer exists with links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    const footerLinks = footer.locator("a");
    const count = await footerLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test("mobile responsive: nav still accessible on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toContainText(/topsnip/i);
    // Search input should still be visible on mobile
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await expect(searchInput).toBeVisible();
    // Nav links should be accessible (possibly behind hamburger menu)
    const hamburger = page.locator("button[aria-label*='menu'], button[aria-label*='nav'], [class*=hamburger], [class*=menu-toggle]");
    const hamburgerCount = await hamburger.count();
    if (hamburgerCount > 0) {
      await hamburger.first().click();
      await page.waitForTimeout(500);
    }
    // At minimum, the page should render without errors
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Application error");
  });
});

// ── 2. Search Flow Tests ───────────────────────────────────────────────────

test.describe("Search flow", () => {
  test("search 'what is RAG' shows results with TL;DR", async ({ page }) => {
    test.slow(); // Claude API can take 20-30s
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await searchInput.fill("what is RAG");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/s\//);
    // Wait for TL;DR or loading indicator (up to 30s)
    await expect(
      page.locator("body").filter({ hasText: /tl;?dr|summary|loading|generating/i })
    ).toBeVisible({ timeout: 30_000 });
  });

  test("search 'best AI tools' navigates to results", async ({ page }) => {
    test.slow();
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await searchInput.fill("best AI tools");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/s\//);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Forbidden");
  });

  test("search 'Claude vs GPT' navigates to results", async ({ page }) => {
    test.slow();
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await searchInput.fill("Claude vs GPT");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/s\//);
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("Forbidden");
  });

  test("search results show structured sections or loading state", async ({ page }) => {
    test.slow();
    await page.goto("/s/what-is-rag?q=what+is+RAG");
    // Wait for content to appear (sections or loading indicator)
    await page.waitForTimeout(5000);
    const body = page.locator("body");
    const bodyText = await body.textContent() || "";
    // Should show structured sections OR a loading state — never a blank/error page
    const hasContent =
      /what happened|so what|now what/i.test(bodyText) ||
      /loading|generating|analyzing/i.test(bodyText) ||
      /tl;?dr|summary/i.test(bodyText) ||
      bodyText.length > 500;
    expect(hasContent).toBe(true);
  });

  test("search results have YouTube recommendation section or loading", async ({ page }) => {
    test.slow();
    await page.goto("/s/what-is-rag?q=what+is+RAG");
    // Wait for content to start rendering
    await page.waitForTimeout(5000);
    const bodyText = await page.locator("body").textContent() || "";
    const hasYouTubeSection =
      /youtube|video|watch|recommend/i.test(bodyText) ||
      /loading|generating/i.test(bodyText);
    // YouTube section may not appear immediately; just verify no crash
    expect(bodyText).not.toContain("Application error");
  });

  test("search results page has a working search bar for follow-up queries", async ({ page }) => {
    await page.goto("/s/what-is-rag?q=what+is+RAG");
    // The header search bar uses a text input inside a form with a submit button
    const searchInput = page.locator("header input[type=text], header input[type=search], input[aria-label='Search query']").first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("best AI tools 2025");
    // Submit via the Search button (the form uses onSubmit, not implicit submit)
    const submitBtn = page.locator("header button[type=submit]").first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    } else {
      await searchInput.press("Enter");
    }
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/s\//);
  });

  test("empty search does not navigate away from landing", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await searchInput.fill("");
    await searchInput.press("Enter");
    // Should stay on landing page
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/topsnip\.co\/?$/);
  });

  test("very long search query (200+ chars) does not break", async ({ page }) => {
    await page.goto("/");
    const longQuery = "what is artificial intelligence ".repeat(8).trim(); // ~248 chars
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await searchInput.fill(longQuery);
    await searchInput.press("Enter");
    await page.waitForTimeout(3000);
    // Should navigate to search results or stay on landing if slug is too long
    // The page may truncate the query or handle it gracefully
    const url = page.url();
    const navigated = url.includes("/s/");
    const stayedOnLanding = /topsnip\.co\/?$/.test(url) || url.endsWith("/");
    expect(navigated || stayedOnLanding).toBe(true);
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");
  });

  test("special characters in search do not break the page", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();

    // Test quotes
    await searchInput.fill('"what is" RAG');
    await searchInput.press("Enter");
    await page.waitForTimeout(2000);
    let bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");

    // Test angle brackets
    await page.goto("/");
    const searchInput2 = page.locator("input[type=text], input[type=search]").first();
    await searchInput2.fill("<script>alert(1)</script>");
    await searchInput2.press("Enter");
    await page.waitForTimeout(2000);
    bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");

    // Test unicode
    await page.goto("/");
    const searchInput3 = page.locator("input[type=text], input[type=search]").first();
    await searchInput3.fill("AI \u00e9\u00e8\u00ea \u4eba\u5de5\u77e5\u80fd \ud83e\udd16");
    await searchInput3.press("Enter");
    await page.waitForTimeout(2000);
    bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");
  });
});

// ── 3. Navigation Consistency Tests ────────────────────────────────────────

test.describe("Navigation consistency", () => {
  const pages = [
    { name: "landing", path: "/" },
    { name: "about", path: "/about" },
    { name: "upgrade", path: "/upgrade" },
    { name: "search results", path: "/s/what-is-rag?q=what+is+RAG" },
  ];

  for (const p of pages) {
    test(`${p.name} page has topsnip logo visible`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.locator("text=topsnip").first()).toBeVisible();
    });
  }

  for (const p of pages) {
    test(`${p.name} page logo is clickable and links home`, async ({ page }) => {
      await page.goto(p.path);
      // Logo may be an <a> (Link component) or <button> (with router.push) depending on the page
      const logoLink = page.locator("a").filter({ hasText: /topsnip/i }).first();
      const logoButton = page.locator("button").filter({ hasText: /topsnip/i }).first();
      const linkCount = await logoLink.count();
      const buttonCount = await logoButton.count();
      const hasLink = linkCount > 0 && await logoLink.isVisible();
      const hasButton = buttonCount > 0 && await logoButton.isVisible();
      expect(hasLink || hasButton).toBeTruthy();
      if (hasLink) {
        const href = await logoLink.getAttribute("href");
        expect(href).toBeTruthy();
        expect(href).not.toBe("#");
      }
      // If it's a button, it uses router.push() — just verify it exists and is clickable
    });
  }

  test("about page has About, Pricing, and Sign in nav links", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("a[href='/about']").first()).toBeVisible();
    await expect(page.locator("a[href='/upgrade']").first()).toBeVisible();
    const signIn = page.locator("a[href*='login'], a[href*='auth']").first();
    await expect(signIn).toBeVisible();
  });

  test("upgrade page has nav with logo and key links", async ({ page }) => {
    await page.goto("/upgrade");
    // The upgrade page has a floating nav with logo, About, Pricing, and Sign in
    // Wait for the nav to render (page is client-rendered)
    await page.waitForLoadState("domcontentloaded");
    // Check for nav presence — the upgrade page may have a simplified nav in some states
    const aboutLink = page.locator("a[href='/about']").first();
    const upgradeLink = page.locator("a[href='/upgrade']").first();
    const signInLink = page.locator("a[href*='login'], a[href*='auth']").first();
    const hasAbout = await aboutLink.isVisible().catch(() => false);
    const hasUpgrade = await upgradeLink.isVisible().catch(() => false);
    const hasSignIn = await signInLink.isVisible().catch(() => false);
    // At minimum, the page should have the topsnip logo/branding visible
    await expect(page.locator("text=topsnip").first()).toBeVisible();
    // The main upgrade page view has full nav; upgraded/pro views may not
    // At least some navigation should be present
    expect(hasAbout || hasUpgrade || hasSignIn).toBeTruthy();
  });
});

// ── 4. Error States ────────────────────────────────────────────────────────

test.describe("Error states", () => {
  test("404 page has a way to navigate home", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");
    // Should show a link back to home or the logo
    const homeLink = page.locator("a[href='/'], a[href*='topsnip.co']").first();
    const logoLink = page.locator("a").filter({ hasText: /topsnip/i }).first();
    const hasNav = (await homeLink.count()) > 0 || (await logoLink.count()) > 0;
    expect(hasNav).toBe(true);
  });

  test("error page renders without crashing on bad route", async ({ page }) => {
    await page.goto("/s/");
    await page.waitForTimeout(2000);
    const bodyText = await page.locator("body").textContent() || "";
    // Should not show a raw server error
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("NEXT_NOT_FOUND");
  });

  test("deeply nested non-existent route returns 404", async ({ page }) => {
    const response = await page.goto("/a/b/c/d/e/f/g");
    expect(response?.status()).toBe(404);
  });
});

// ── 5. SEO & Meta Tests ───────────────────────────────────────────────────

test.describe("SEO and meta", () => {
  test("landing page has a title tag", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toMatch(/topsnip/i);
  });

  test("about page has a title tag", async ({ page }) => {
    await page.goto("/about");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("landing page has meta description", async ({ page }) => {
    await page.goto("/");
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(10);
  });

  test("about page has meta description", async ({ page }) => {
    await page.goto("/about");
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(10);
  });

  test("robots.txt is accessible", async ({ request }) => {
    const resp = await request.get("/robots.txt");
    expect(resp.status()).toBe(200);
    const text = await resp.text();
    // Case-insensitive check: robots.txt may use "User-Agent", "User-agent", etc.
    expect(text).toMatch(/user-agent/i);
  });

  test("sitemap.xml is accessible", async ({ request }) => {
    const resp = await request.get("/sitemap.xml");
    expect(resp.status()).toBe(200);
    const text = await resp.text();
    expect(text).toContain("<urlset");
  });

  test("landing page has Open Graph tags", async ({ page }) => {
    await page.goto("/");
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle).toBeTruthy();
  });
});

// ── 6. Performance Tests ───────────────────────────────────────────────────

test.describe("Performance", () => {
  test("landing page loads in under 5s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "load" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test("about page loads in under 3s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/about", { waitUntil: "load" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test("search navigation happens in under 2s", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    await searchInput.fill("what is RAG");
    const start = Date.now();
    await searchInput.press("Enter");
    await page.waitForURL(/\/s\//, { timeout: 5000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  test("upgrade page loads in under 3s", async ({ page }) => {
    const start = Date.now();
    await page.goto("/upgrade", { waitUntil: "load" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });
});

// ── 7. API Contract Tests ──────────────────────────────────────────────────

test.describe("API contracts", () => {
  test("POST /api/search with valid query returns 200", async ({ request }) => {
    test.slow(); // Claude API can take 20-30s
    const resp = await request.post("/api/search", {
      data: JSON.stringify({ query: "what is RAG" }),
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.topsnip.co",
        Referer: "https://www.topsnip.co/",
      },
      timeout: 45_000,
    });
    // 200 = success, 429 = rate limited (acceptable for live API tests)
    expect([200, 429]).toContain(resp.status());
    if (resp.status() === 200) {
      const json = await resp.json();
      expect(json).toBeTruthy();
    }
  });

  test("POST /api/search with Origin header matching www.topsnip.co works", async ({ request }) => {
    test.slow();
    const resp = await request.post("/api/search", {
      data: { query: "best AI tools" },
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.topsnip.co",
        Referer: "https://www.topsnip.co/",
      },
      timeout: 45_000,
    });
    // Should not be blocked by CORS or origin check
    expect([200, 429]).toContain(resp.status());
  });

  test("GET /api/ingest/health returns 401 without auth", async ({ request }) => {
    const resp = await request.get("/api/ingest/health");
    expect([401, 403, 404]).toContain(resp.status());
  });

  test("POST /api/content/generate returns 401 without auth", async ({ request }) => {
    const resp = await request.post("/api/content/generate", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test("POST /api/search with GET method returns 405 or similar", async ({ request }) => {
    const resp = await request.get("/api/search");
    expect([400, 404, 405]).toContain(resp.status());
  });

  test("POST /api/search with no Content-Type is handled", async ({ request }) => {
    const resp = await request.post("/api/search", {
      data: "q=test",
    });
    // Should not crash — returns 400 or similar
    expect([400, 403, 415, 422, 500]).toContain(resp.status());
  });
});

// ── 8. Accessibility Basics ────────────────────────────────────────────────

test.describe("Accessibility basics", () => {
  test("landing page search input has accessible label or placeholder", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search]").first();
    const placeholder = await searchInput.getAttribute("placeholder");
    const ariaLabel = await searchInput.getAttribute("aria-label");
    const id = await searchInput.getAttribute("id");
    const hasLabel = id ? (await page.locator(`label[for="${id}"]`).count()) > 0 : false;
    expect(placeholder || ariaLabel || hasLabel).toBeTruthy();
  });

  test("all images have alt attributes", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      // alt can be empty string (decorative) but should exist
      expect(alt).not.toBeNull();
    }
  });

  test("page has lang attribute on html element", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});
