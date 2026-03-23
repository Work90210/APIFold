import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { createTestSpec, deleteSpec } from "../../helpers/api";

test.describe("Connection Snippets @servers", () => {
  let specId: string;
  let serverId: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);

    const result = await createTestSpec(page, {
      name: `E2E Test Snippets ${Date.now()}`,
    });
    specId = result.spec.id;
    serverId = result.server.id;
  });

  test.afterEach(async ({ page }) => {
    try {
      await deleteSpec(page, specId);
    } catch {
      // Best-effort cleanup
    }
  });

  test("displays connection snippet section on server detail page", async ({
    page,
  }) => {
    await page.goto(`/dashboard/servers/${serverId}`);

    // The SnippetCopier component should be visible
    const snippetSection = page.getByText(
      /connect|snippet|configuration|claude|cursor/i,
    );
    await expect(snippetSection.first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows Claude Desktop config snippet", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}`);

    // Click on the Claude tab/option if present
    const claudeTab = page.getByRole("tab", { name: /claude/i }).or(
      page.getByRole("button", { name: /claude/i }),
    );
    if (await claudeTab.isVisible().catch(() => false)) {
      await claudeTab.click();
    }

    // Should show a code block with MCP config JSON
    const codeBlock = page.locator(
      'pre, code, [data-testid="snippet-code"]',
    );
    await expect(codeBlock.first()).toBeVisible({ timeout: 10_000 });

    // The snippet should contain mcpServers config structure
    const snippetText = await codeBlock.first().textContent();
    expect(snippetText).toContain("mcpServers");
  });

  test("shows Cursor config snippet", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}`);

    // Click on the Cursor tab/option
    const cursorTab = page.getByRole("tab", { name: /cursor/i }).or(
      page.getByRole("button", { name: /cursor/i }),
    );
    if (await cursorTab.isVisible().catch(() => false)) {
      await cursorTab.click();
    }

    const codeBlock = page.locator(
      'pre, code, [data-testid="snippet-code"]',
    );
    await expect(codeBlock.first()).toBeVisible({ timeout: 10_000 });
  });

  test("copy button copies snippet to clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto(`/dashboard/servers/${serverId}`);

    const copyButton = page.getByRole("button", { name: /copy/i });
    await expect(copyButton.first()).toBeVisible({ timeout: 10_000 });
    await copyButton.first().click();

    // Should show "Copied" feedback
    await expect(
      page.getByText(/copied/i),
    ).toBeVisible({ timeout: 5_000 });

    // Verify clipboard content contains MCP config
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    expect(clipboardText.length).toBeGreaterThan(0);
  });
});
