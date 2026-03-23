import { test, expect } from "@playwright/test";

test.describe("Landing Page Navigation @landing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("header navigation links are visible", async ({ page }) => {
    const nav = page.locator("header nav, nav").first();
    await expect(nav).toBeVisible({ timeout: 10_000 });
  });

  test("logo links back to home page", async ({ page }) => {
    const logo = page.locator(
      'header a[href="/"], [data-testid="logo"], header a:first-child',
    ).first();
    await expect(logo).toBeVisible({ timeout: 10_000 });

    await logo.click();
    expect(page.url()).toMatch(/\/$/);
  });

  test("sign-in link navigates to sign-in page", async ({ page }) => {
    const signInLink = page.getByRole("link", {
      name: /sign in|log in|login/i,
    });
    await expect(signInLink.first()).toBeVisible({ timeout: 10_000 });
    await signInLink.first().click();

    await page.waitForURL(/sign-in/, { timeout: 15_000 });
    expect(page.url()).toContain("sign-in");
  });

  test("get started CTA navigates to sign-up or dashboard", async ({
    page,
  }) => {
    const ctaButton = page.getByRole("link", {
      name: /get started|sign up|try free/i,
    });
    await expect(ctaButton.first()).toBeVisible({ timeout: 10_000 });
    await ctaButton.first().click();

    // Should navigate to sign-up or dashboard
    await page.waitForURL(/sign-up|dashboard/, { timeout: 15_000 });
    const url = page.url();
    expect(url.includes("sign-up") || url.includes("dashboard")).toBe(true);
  });

  test("docs link navigates to documentation", async ({ page }) => {
    const docsLink = page.getByRole("link", { name: /docs|documentation/i });

    if (await docsLink.first().isVisible().catch(() => false)) {
      await docsLink.first().click();
      await page.waitForURL(/docs/, { timeout: 15_000 });
      expect(page.url()).toContain("docs");
    }
  });

  test("changelog link navigates to changelog page", async ({ page }) => {
    const changelogLink = page.getByRole("link", { name: /changelog/i });

    if (await changelogLink.first().isVisible().catch(() => false)) {
      await changelogLink.first().click();
      await page.waitForURL(/changelog/, { timeout: 15_000 });
      expect(page.url()).toContain("changelog");
    }
  });

  test("footer links are present and functional", async ({ page }) => {
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 10_000 });

    // Footer should contain links
    const footerLinks = footer.locator("a");
    const linkCount = await footerLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    // All footer links should have valid href attributes
    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      const href = await footerLinks.nth(i).getAttribute("href");
      expect(href).toBeTruthy();
      expect(href!.length).toBeGreaterThan(0);
    }
  });

  test("works-with-bar shows agent logos/names", async ({ page }) => {
    // The WorksWithBar component should show compatible AI agents
    const worksWithSection = page.getByText(
      /works with|compatible|integrates/i,
    );
    await worksWithSection.first().scrollIntoViewIfNeeded();
    await expect(worksWithSection.first()).toBeVisible();
  });

  test("all anchor links on the page have valid hrefs", async ({ page }) => {
    const links = page.locator("a[href]");
    const count = await links.count();

    const invalidLinks: string[] = [];

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (!href || href === "#" || href.startsWith("javascript:")) {
        const text = await links.nth(i).textContent();
        invalidLinks.push(`"${text?.trim()}" -> "${href}"`);
      }
    }

    // Allow a small number of anchor-only links (e.g., skip-to-content)
    expect(invalidLinks.length).toBeLessThanOrEqual(2);
  });

  test("page is responsive - no horizontal overflow on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // Body should not overflow horizontally
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
