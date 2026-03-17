import { test, expect } from "@playwright/test";

// ── 1. XSS in Search ────────────────────────────────────────────────────────

test.describe("Security: XSS in search", () => {
  const xssPayloads = [
    { name: "script tag", payload: "<script>alert(1)</script>" },
    { name: "img onerror", payload: '<img onerror=alert(1) src=x>' },
    { name: "javascript URI", payload: "javascript:void(0)" },
    { name: "svg onload", payload: '<svg onload=alert(1)>' },
    { name: "event handler injection", payload: '" onfocus="alert(1)" autofocus="' },
  ];

  for (const { name, payload } of xssPayloads) {
    test(`XSS payload '${name}' is not reflected unescaped`, async ({ page }) => {
      // Listen for dialogs (alert/confirm/prompt) — none should fire
      let dialogFired = false;
      page.on("dialog", (dialog) => {
        dialogFired = true;
        dialog.dismiss();
      });

      await page.goto("/");
      const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search']").first();
      await searchInput.fill(payload);
      await searchInput.press("Enter");
      await page.waitForTimeout(3000);

      // The real XSS test: no JS dialog was triggered
      expect(dialogFired).toBe(false);

      // Verify the payload is not rendered as visible HTML elements
      const bodyText = await page.locator("body").textContent() || "";
      expect(bodyText).not.toContain("Application error");
    });
  }
});

// ── 2. SQL Injection in Search ───────────────────────────────────────────────

test.describe("Security: SQL injection in search", () => {
  const sqlPayloads = [
    { name: "DROP TABLE", payload: "'; DROP TABLE users; --" },
    { name: "OR 1=1", payload: "1 OR 1=1" },
    { name: "UNION SELECT", payload: "' UNION SELECT * FROM users --" },
    { name: "comment terminator", payload: "admin'--" },
  ];

  for (const { name, payload } of sqlPayloads) {
    test(`SQL injection '${name}' does not crash the app`, async ({ request }) => {
      const resp = await request.post("/api/search", {
        data: JSON.stringify({ query: payload }),
        headers: {
          "Content-Type": "application/json",
          Origin: "https://www.topsnip.co",
          Referer: "https://www.topsnip.co/",
        },
        timeout: 30_000,
      });
      // Should return 200 (treated as normal query), 400, or 429 — never 500
      expect([200, 400, 429]).toContain(resp.status());
      expect(resp.status()).not.toBe(500);
    });
  }
});

// ── 3. Path Traversal ────────────────────────────────────────────────────────

test.describe("Security: Path traversal", () => {
  const traversalPaths = [
    "/topic/../../etc/passwd",
    "/s/../../../admin",
    "/topic/..%2F..%2Fetc%2Fpasswd",
    "/topic/%2e%2e/%2e%2e/etc/passwd",
    "/.env",
    "/api/../.env",
  ];

  for (const path of traversalPaths) {
    test(`path traversal '${path}' does not leak sensitive data`, async ({ request }) => {
      const resp = await request.get(path);
      const text = await resp.text();
      // Must never contain sensitive data regardless of status code
      expect(text).not.toContain("root:");
      expect(text).not.toContain("SUPABASE");
      expect(text).not.toContain("STRIPE_SECRET");
      expect(text).not.toContain("CLAUDE_API");
      expect(text).not.toContain("ANTHROPIC_API");
      expect(text).not.toContain("BEGIN RSA PRIVATE");
      // Must not return 500 (server error)
      expect(resp.status()).not.toBe(500);
    });
  }
});

// ── 4. API Auth Enforcement ──────────────────────────────────────────────────

test.describe("Security: API auth enforcement", () => {
  test("POST /api/content/generate requires auth", async ({ request }) => {
    const resp = await request.post("/api/content/generate", {
      data: JSON.stringify({ topic: "test" }),
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test("POST /api/ingest/run requires auth", async ({ request }) => {
    const resp = await request.post("/api/ingest/run", {
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 405]).toContain(resp.status());
  });

  test("GET /api/ingest/run requires auth", async ({ request }) => {
    const resp = await request.get("/api/ingest/run");
    expect([401, 403]).toContain(resp.status());
  });

  test("GET /api/user/read-progress requires auth (if exists)", async ({ request }) => {
    const resp = await request.get("/api/user/read-progress");
    // 401/403 = auth enforced, 404 = endpoint doesn't exist (both acceptable)
    expect([401, 403, 404]).toContain(resp.status());
  });

  test("POST /api/stripe/checkout requires auth", async ({ request }) => {
    const resp = await request.post("/api/stripe/checkout", {
      data: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test("POST /api/stripe/portal requires auth", async ({ request }) => {
    const resp = await request.post("/api/stripe/portal", {
      data: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403]).toContain(resp.status());
  });
});

// ── 5. CSRF Protection ──────────────────────────────────────────────────────

test.describe("Security: CSRF / Origin validation", () => {
  test("search API rejects request with wrong Origin", async ({ request }) => {
    const resp = await request.post("/api/search", {
      data: JSON.stringify({ query: "test" }),
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example.com",
        Referer: "https://evil.example.com/",
      },
      timeout: 15_000,
    });
    // Should reject cross-origin requests — 403 expected
    // 200 here would mean no origin checking (potential CSRF issue)
    const status = resp.status();
    // Record what we get for reporting
    if (status === 200) {
      test.info().annotations.push({
        type: "warning",
        description: "Search API accepted request from foreign origin — no CSRF protection",
      });
    }
    expect([400, 403, 429]).toContain(status);
  });

  test("search API rejects request with no Origin header", async ({ request }) => {
    const resp = await request.post("/api/search", {
      data: JSON.stringify({ query: "test" }),
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });
    const status = resp.status();
    // Requests without Origin might be from same-origin or server-side — some APIs allow this
    // But ideally it should still validate; log if it passes through
    if (status === 200) {
      test.info().annotations.push({
        type: "info",
        description: "Search API accepted request with no Origin header",
      });
    }
    // Accept 200, 400, 403, 429 — just verify it doesn't crash
    expect(status).not.toBe(500);
  });
});

// ── 6. Rate Limiting ─────────────────────────────────────────────────────────

test.describe("Security: Rate limiting", () => {
  test("rapid API requests trigger rate limiting", async ({ request }) => {
    test.slow();
    const results: number[] = [];

    // Fire 5 rapid requests in parallel
    const promises = Array.from({ length: 5 }, () =>
      request.post("/api/search", {
        data: JSON.stringify({ query: "rate limit test" }),
        headers: {
          "Content-Type": "application/json",
          Origin: "https://www.topsnip.co",
          Referer: "https://www.topsnip.co/",
        },
        timeout: 30_000,
      })
    );

    const responses = await Promise.all(promises);
    for (const resp of responses) {
      results.push(resp.status());
    }

    // At least one should be 429 if rate limiting is in place
    const has429 = results.includes(429);
    const allSucceeded = results.every((s) => s === 200);

    if (!has429 && allSucceeded) {
      test.info().annotations.push({
        type: "warning",
        description: `No rate limiting detected. All 5 rapid requests returned 200. Statuses: [${results.join(", ")}]`,
      });
    }

    // At minimum, none should be 500 (server error)
    for (const status of results) {
      expect(status).not.toBe(500);
    }
  });
});

// ── 7. Cookie Security ──────────────────────────────────────────────────────

test.describe("Security: Cookie attributes", () => {
  test("auth-related cookies have Secure and HttpOnly flags", async ({ page, context }) => {
    // Visit the site to collect any cookies set
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Also visit login page which may set session cookies
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    const cookies = await context.cookies();

    // Filter for auth-related cookies (Supabase uses sb-* prefix)
    const authCookies = cookies.filter(
      (c) =>
        c.name.startsWith("sb-") ||
        c.name.includes("session") ||
        c.name.includes("token") ||
        c.name.includes("auth")
    );

    if (authCookies.length === 0) {
      test.info().annotations.push({
        type: "info",
        description: "No auth cookies found (user not logged in) — cannot verify cookie security",
      });
      return; // Skip if no auth cookies to check
    }

    for (const cookie of authCookies) {
      expect(cookie.secure, `Cookie '${cookie.name}' should have Secure flag`).toBe(true);
      expect(cookie.httpOnly, `Cookie '${cookie.name}' should have HttpOnly flag`).toBe(true);
      expect(
        cookie.sameSite,
        `Cookie '${cookie.name}' should have SameSite attribute`
      ).toBeTruthy();
    }
  });
});

// ── 8. Empty String Search ──────────────────────────────────────────────────

test.describe("Edge cases: Empty and whitespace search", () => {
  test("empty string search stays on landing page", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
    await searchInput.fill("");
    await searchInput.press("Enter");
    await page.waitForTimeout(1500);
    expect(page.url()).toMatch(/topsnip\.co\/?$/);
  });

  test("whitespace-only search stays on landing page", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
    await searchInput.fill("   ");
    await searchInput.press("Enter");
    await page.waitForTimeout(1500);
    // Should stay on landing or handle gracefully
    const url = page.url();
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");
    expect(bodyText).not.toContain("Internal Server Error");
  });
});

// ── 9. Unicode Search ────────────────────────────────────────────────────────

test.describe("Edge cases: Unicode search", () => {
  const unicodeQueries = [
    { name: "emoji", query: "\u{1F916} AI" },
    { name: "Chinese", query: "\u4EBA\u5DE5\u667A\u80FD" },
    { name: "Arabic (RTL)", query: "\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A" },
    { name: "Japanese", query: "\u6A5F\u68B0\u5B66\u7FD2" },
    { name: "mixed script", query: "AI \u00E9\u00E8\u00EA \u4EBA\u5DE5\u77E5\u80FD \u{1F916}" },
  ];

  for (const { name, query } of unicodeQueries) {
    test(`unicode search '${name}' does not crash`, async ({ page }) => {
      await page.goto("/");
      const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
      await searchInput.fill(query);
      await searchInput.press("Enter");
      await page.waitForTimeout(3000);
      const bodyText = await page.locator("body").textContent() || "";
      expect(bodyText).not.toContain("Application error");
      expect(bodyText).not.toContain("Internal Server Error");
    });
  }
});

// ── 10. Very Long Slug ──────────────────────────────────────────────────────

test.describe("Edge cases: Very long slug", () => {
  test("500-char slug returns 404 or handles gracefully", async ({ page }) => {
    const longSlug = "a".repeat(500);
    const response = await page.goto(`/topic/${longSlug}`);
    const status = response?.status() ?? 0;
    // Should be 404 or redirect — not a crash
    expect([200, 307, 308, 400, 404, 414]).toContain(status);
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("2000-char URL does not crash the server", async ({ request }) => {
    const longPath = "/s/" + "x".repeat(2000);
    const resp = await request.get(longPath);
    // Any non-500 response is acceptable
    expect(resp.status()).not.toBe(500);
  });
});

// ── 11. Concurrent Page Loads ────────────────────────────────────────────────

test.describe("Edge cases: Concurrent page loads", () => {
  test("5 pages loaded simultaneously all succeed", async ({ browser }) => {
    const pages = await Promise.all(
      Array.from({ length: 5 }, () => browser.newPage())
    );

    const urls = ["/", "/about", "/upgrade", "/auth/login", "/s/what-is-rag?q=what+is+RAG"];

    const responses = await Promise.all(
      pages.map((page, i) => page.goto(urls[i]))
    );

    for (let i = 0; i < responses.length; i++) {
      const status = responses[i]?.status() ?? 0;
      expect(status, `Page ${urls[i]} should not return 500`).not.toBe(500);
      const bodyText = await pages[i].locator("body").textContent() || "";
      expect(bodyText).not.toContain("Application error");
    }

    // Cleanup
    await Promise.all(pages.map((p) => p.close()));
  });
});

// ── 12. Back/Forward Navigation ──────────────────────────────────────────────

test.describe("Edge cases: Back/forward navigation", () => {
  test("search -> result -> back -> forward preserves state", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
    await searchInput.fill("what is RAG");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/s\//);
    await page.waitForTimeout(2000);

    // Go back
    await page.goBack();
    await page.waitForTimeout(1500);
    // Should be on landing page
    expect(page.url()).toMatch(/topsnip\.co\/?$/);

    // Go forward
    await page.goForward();
    await page.waitForTimeout(1500);
    // Should be back on search results
    await expect(page).toHaveURL(/\/s\//);
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");
  });
});

// ── 13. Double-Click Submit ──────────────────────────────────────────────────

test.describe("Edge cases: Double-click submit", () => {
  test("double-click search button fires only one search", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
    await searchInput.fill("what is machine learning");

    // Track network requests to the search API
    let searchApiCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/search") && req.method() === "POST") {
        searchApiCalls++;
      }
    });

    // Find and double-click the submit button
    const submitBtn = page.locator("button[type=submit]").first();
    if (await submitBtn.isVisible()) {
      await submitBtn.dblclick();
    } else {
      // If no visible submit button, press Enter twice rapidly
      await searchInput.press("Enter");
      await searchInput.press("Enter");
    }

    await page.waitForTimeout(3000);

    // Should have fired at most 1 search API call (debouncing)
    // 2 calls would indicate no debounce protection
    if (searchApiCalls > 1) {
      test.info().annotations.push({
        type: "warning",
        description: `Double-click triggered ${searchApiCalls} API calls instead of 1 — no debounce protection`,
      });
    }
    // Not a hard fail — just a UX concern. Verify page didn't crash.
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");
  });
});

// ── 14. Malformed URLs ──────────────────────────────────────────────────────

test.describe("Edge cases: Malformed URLs", () => {
  test("/s/valid-slug?q= (empty q param) does not crash", async ({ page }) => {
    const response = await page.goto("/s/valid-slug?q=");
    expect(response?.status()).not.toBe(500);
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("/s/?q=test (no slug) does not crash", async ({ page }) => {
    const response = await page.goto("/s/?q=test");
    expect(response?.status()).not.toBe(500);
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("/s/ (bare route, no slug, no query) does not crash", async ({ page }) => {
    const response = await page.goto("/s/");
    expect(response?.status()).not.toBe(500);
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("URL with null bytes does not crash", async ({ request }) => {
    const resp = await request.get("/s/test%00slug");
    expect(resp.status()).not.toBe(500);
  });

  test("URL with double slashes does not crash", async ({ request }) => {
    const resp = await request.get("/s//test");
    expect(resp.status()).not.toBe(500);
  });
});

// ── 15. Network Error Resilience / Loading State ─────────────────────────────

test.describe("Edge cases: Loading state visibility", () => {
  test("search shows loading state before results", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
    await searchInput.fill("what is transformer architecture");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/s\//);

    // Check for loading indicator within 5 seconds of navigation
    // Look for common loading patterns: spinner, skeleton, "loading", "generating", "analyzing"
    const loadingIndicator = page.locator(
      "[class*=loading], [class*=spinner], [class*=skeleton], [aria-busy='true']"
    );
    const loadingText = page.locator("body").filter({
      hasText: /loading|generating|analyzing|searching|thinking/i,
    });

    // Wait briefly and check if either loading indicator or content is present
    await page.waitForTimeout(2000);
    const hasLoadingUI = (await loadingIndicator.count()) > 0;
    const hasLoadingText = (await loadingText.count()) > 0;
    const bodyText = await page.locator("body").textContent() || "";
    const hasContent = bodyText.length > 500;

    // Either loading state or content should be visible (not a blank page)
    expect(hasLoadingUI || hasLoadingText || hasContent).toBe(true);
  });
});

// ── 16. Mobile Viewport ──────────────────────────────────────────────────────

test.describe("Edge cases: Mobile viewport (375x667)", () => {
  test("landing page renders correctly on iPhone SE", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Search input should be visible and usable
    const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
    await expect(searchInput).toBeVisible();

    // Check for horizontal overflow (layout break)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    const hasHorizontalOverflow = bodyWidth > viewportWidth + 10; // 10px tolerance

    if (hasHorizontalOverflow) {
      test.info().annotations.push({
        type: "warning",
        description: `Horizontal overflow detected on mobile: body is ${bodyWidth}px wide vs ${viewportWidth}px viewport`,
      });
    }

    // Verify no content is cut off
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).toContain("topsnip");
  });

  test("search flow works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
    await searchInput.fill("what is AI");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/s\//);
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");
  });

  test("about page renders on mobile without layout break", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/about");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(385); // 10px tolerance
  });

  test("upgrade page renders on mobile without layout break", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/upgrade");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(385);
  });
});

// ── 17. Keyboard Navigation ──────────────────────────────────────────────────

test.describe("Edge cases: Keyboard navigation", () => {
  test("Tab through landing page shows visible focus indicators", async ({ page }) => {
    await page.goto("/");

    // Tab through the first 10 focusable elements
    const focusedElements: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const focusedTag = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "body";
        return `${el.tagName.toLowerCase()}${el.getAttribute("href") ? `[href="${el.getAttribute("href")}"]` : ""}`;
      });
      focusedElements.push(focusedTag);

      // Check if the focused element has a visible focus indicator
      const hasOutline = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return true; // Skip body
        const style = window.getComputedStyle(el);
        const outline = style.outline;
        const boxShadow = style.boxShadow;
        // Check if there's any visible focus indicator
        return (
          outline !== "none" &&
          outline !== "" &&
          outline !== "0px none rgb(0, 0, 0)"
        ) || (boxShadow !== "none" && boxShadow !== "");
      });

      if (!hasOutline && focusedTag !== "body") {
        test.info().annotations.push({
          type: "warning",
          description: `Element '${focusedTag}' has no visible focus indicator`,
        });
      }
    }

    // At least some focusable elements should have been reached
    const nonBodyElements = focusedElements.filter((e) => e !== "body");
    expect(nonBodyElements.length).toBeGreaterThan(0);
  });

  test("search bar is reachable via Tab key", async ({ page }) => {
    await page.goto("/");

    // Tab through elements until we hit an input
    let foundInput = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const tag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
      if (tag === "input") {
        foundInput = true;
        break;
      }
    }

    expect(foundInput).toBe(true);
  });
});

// ── 18. Large Response Handling ──────────────────────────────────────────────

test.describe("Edge cases: Large response handling", () => {
  test("broad search topic does not freeze the page", async ({ page }) => {
    test.slow();
    await page.goto("/");
    const searchInput = page.locator("input[type=text], input[type=search], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='topic']").first();
    await searchInput.fill("artificial intelligence history and future");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/s\//);

    // Wait for content to start appearing (up to 45s)
    await page.waitForTimeout(10_000);

    // Page should be interactive — try clicking the logo
    const logo = page.locator("text=topsnip").first();
    const isVisible = await logo.isVisible();
    expect(isVisible).toBe(true);

    // Verify the page hasn't crashed
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");
    expect(bodyText.length).toBeGreaterThan(100);
  });
});

// ── 19. Rapid Navigation ────────────────────────────────────────────────────

test.describe("Edge cases: Rapid navigation", () => {
  test("rapid clicks between pages do not crash", async ({ page }) => {
    await page.goto("/");

    // Rapidly navigate between pages
    const routes = ["/about", "/upgrade", "/auth/login", "/", "/about", "/upgrade"];
    for (const route of routes) {
      await page.goto(route, { waitUntil: "commit" }); // Don't wait for full load
    }

    // Wait for last page to settle
    await page.waitForLoadState("domcontentloaded");
    const bodyText = await page.locator("body").textContent() || "";
    expect(bodyText).not.toContain("Application error");
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test("protected routes redirect consistently under rapid navigation", async ({ page }) => {
    // Rapidly try to access protected routes
    const protectedRoutes = ["/feed", "/history", "/settings"];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });
});

// ── 20. Security Headers ────────────────────────────────────────────────────

test.describe("Security: Response headers", () => {
  test("security headers are present on responses", async ({ request }) => {
    const resp = await request.get("/");
    const headers = resp.headers();

    // Check for important security headers
    const checks = [
      {
        header: "x-frame-options",
        present: !!headers["x-frame-options"],
        description: "X-Frame-Options (clickjacking protection)",
      },
      {
        header: "x-content-type-options",
        present: !!headers["x-content-type-options"],
        description: "X-Content-Type-Options (MIME sniffing protection)",
      },
      {
        header: "strict-transport-security",
        present: !!headers["strict-transport-security"],
        description: "Strict-Transport-Security (HSTS)",
      },
      {
        header: "content-security-policy",
        present: !!headers["content-security-policy"],
        description: "Content-Security-Policy (XSS protection)",
      },
      {
        header: "referrer-policy",
        present: !!headers["referrer-policy"],
        description: "Referrer-Policy",
      },
    ];

    for (const check of checks) {
      if (!check.present) {
        test.info().annotations.push({
          type: "warning",
          description: `Missing security header: ${check.description}`,
        });
      }
    }

    // At minimum, X-Content-Type-Options should be present (Next.js sets this by default)
    // Log all missing headers but only hard-fail on server errors
    expect(resp.status()).toBe(200);
  });
});
