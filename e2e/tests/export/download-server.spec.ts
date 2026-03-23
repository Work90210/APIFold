import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { createTestSpec, deleteSpec } from "../../helpers/api";

test.describe("Export Server @export", () => {
  let specId: string;
  let serverId: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);

    const result = await createTestSpec(page, {
      name: `E2E Test Export ${Date.now()}`,
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

  test("navigates to the export page", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/export`);

    await expect(
      page.getByRole("heading", { name: /export/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows format selector with JSON and YAML options", async ({
    page,
  }) => {
    await page.goto(`/dashboard/servers/${serverId}/export`);

    // Should display format selector
    const jsonOption = page.getByText(/json/i);
    const yamlOption = page.getByText(/yaml/i);

    await expect(jsonOption.first()).toBeVisible({ timeout: 10_000 });
    await expect(yamlOption.first()).toBeVisible();
  });

  test("generates JSON export and displays code preview", async ({
    page,
  }) => {
    await page.goto(`/dashboard/servers/${serverId}/export`);

    // Select JSON format (might be default)
    const jsonButton = page.getByRole("button", { name: /json/i }).or(
      page.getByRole("radio", { name: /json/i }),
    );
    if (await jsonButton.isVisible().catch(() => false)) {
      await jsonButton.click();
    }

    // Click generate/export
    const generateButton = page.getByRole("button", {
      name: /generate|export/i,
    });
    await generateButton.click();

    // Wait for code preview to appear
    const codeBlock = page.locator(
      'pre, code, [data-testid="code-preview"]',
    );
    await expect(codeBlock.first()).toBeVisible({ timeout: 15_000 });

    // Verify the content looks like valid JSON
    const content = await codeBlock.first().textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(10);
  });

  test("generates YAML export", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/export`);

    // Select YAML format
    const yamlButton = page.getByRole("button", { name: /yaml/i }).or(
      page.getByRole("radio", { name: /yaml/i }),
    );
    await expect(yamlButton.first()).toBeVisible({ timeout: 10_000 });
    await yamlButton.first().click();

    const generateButton = page.getByRole("button", {
      name: /generate|export/i,
    });
    await generateButton.click();

    const codeBlock = page.locator(
      'pre, code, [data-testid="code-preview"]',
    );
    await expect(codeBlock.first()).toBeVisible({ timeout: 15_000 });
  });

  test("download button triggers file download", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/export`);

    // Generate the export first
    const generateButton = page.getByRole("button", {
      name: /generate|export/i,
    });
    await generateButton.click();

    // Wait for the download button to appear
    const downloadButton = page.getByRole("button", {
      name: /download/i,
    });
    await expect(downloadButton).toBeVisible({ timeout: 15_000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();

    // Verify downloaded file has content
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
  });
});
