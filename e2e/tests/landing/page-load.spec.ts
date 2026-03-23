import { test, expect } from "@playwright/test";

test.describe("Landing Page Load @landing", () => {
  test("renders the landing page with hero section", async ({ page }) => {
    await page.goto("/");

    // Hero section should have the main tagline
    await expect(
      page.getByText(/your api.*any ai agent|turn any rest api/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays the main heading", async ({ page }) => {
    await page.goto("/");

    const heading = page.getByRole("heading", { level: 1 }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const headingText = await heading.textContent();
    expect(headingText!.length).toBeGreaterThan(0);
  });

  test("renders the features grid section", async ({ page }) => {
    await page.goto("/");

    // Scroll to features section
    const features = page.getByText(/features/i).first();
    if (await features.isVisible().catch(() => false)) {
      await features.scrollIntoViewIfNeeded();
    }

    // Should have multiple feature cards or items
    await expect(page.locator("main, body")).toContainText(
      /mcp|api|server|tool/i,
    );
  });

  test("renders the how-it-works section", async ({ page }) => {
    await page.goto("/");

    const howItWorks = page.getByText(/how it works/i);
    await expect(howItWorks.first()).toBeVisible({ timeout: 10_000 });
  });

  test("renders the self-host section", async ({ page }) => {
    await page.goto("/");

    const selfHost = page.getByText(/self.host|open source/i);
    await expect(selfHost.first()).toBeVisible({ timeout: 10_000 });
  });

  test("renders the CTA banner", async ({ page }) => {
    await page.goto("/");

    // Should have a call-to-action button
    const ctaButton = page.getByRole("link", {
      name: /get started|sign up|try free/i,
    });
    await expect(ctaButton.first()).toBeVisible({ timeout: 10_000 });
  });

  test("CLS is below 0.1 threshold", async ({ page }) => {
    await page.goto("/");

    // Wait for the page to fully load and settle
    await page.waitForLoadState("networkidle");

    // Measure CLS using the PerformanceObserver API
    const cls = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as unknown as {
              hadRecentInput: boolean;
              value: number;
            };
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value;
            }
          }
        });

        observer.observe({ type: "layout-shift", buffered: true });

        // Give a short window for additional shifts
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3_000);
      });
    });

    expect(cls).toBeLessThan(0.1);
  });

  test("page loads within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    // Page should load DOM content within 5 seconds
    expect(loadTime).toBeLessThan(5_000);
  });

  test("meta tags are present for SEO", async ({ page }) => {
    await page.goto("/");

    const title = await page.title();
    expect(title).toContain("APIFold");

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content", /.+/);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);
  });
});
