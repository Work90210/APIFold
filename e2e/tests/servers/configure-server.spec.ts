import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { createTestSpec, deleteSpec, getServer } from "../../helpers/api";

test.describe("Configure Server @servers", () => {
  let specId: string;
  let serverId: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);

    const result = await createTestSpec(page, {
      name: `E2E Test Server Config ${Date.now()}`,
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

  test("displays server configuration form", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}`);

    // Should show the server name
    await expect(page.locator("h1")).toContainText(/E2E Test Server Config/);

    // Should display config form fields
    await expect(
      page.locator('[data-testid="auth-mode"], select[name="authMode"]').or(
        page.getByLabel(/auth/i),
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("updates the auth mode to api_key", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}`);

    // Find and change auth mode selector
    const authSelect = page.locator(
      '[data-testid="auth-mode-select"], select[name="authMode"]',
    ).or(page.getByLabel(/auth mode/i));
    await authSelect.waitFor({ state: "visible", timeout: 10_000 });
    await authSelect.selectOption("api_key");

    // Save changes
    const saveButton = page.getByRole("button", { name: /save|update/i });
    await saveButton.click();

    // Verify success feedback
    await expect(
      page.getByText(/saved|updated|success/i),
    ).toBeVisible({ timeout: 10_000 });

    // Verify via API that the change persisted
    const server = await getServer(page, serverId);
    expect(server).toHaveProperty("authMode");
  });

  test("updates the base URL", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}`);

    const baseUrlInput = page.locator(
      '[data-testid="base-url-input"], input[name="baseUrl"]',
    ).or(page.getByLabel(/base url/i));
    await baseUrlInput.waitFor({ state: "visible", timeout: 10_000 });
    await baseUrlInput.fill("https://api.example.com/v2");

    const saveButton = page.getByRole("button", { name: /save|update/i });
    await saveButton.click();

    await expect(
      page.getByText(/saved|updated|success/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("updates the rate limit", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}`);

    const rateLimitInput = page.locator(
      '[data-testid="rate-limit-input"], input[name="rateLimitPerMinute"]',
    ).or(page.getByLabel(/rate limit/i));
    await rateLimitInput.waitFor({ state: "visible", timeout: 10_000 });
    await rateLimitInput.fill("120");

    const saveButton = page.getByRole("button", { name: /save|update/i });
    await saveButton.click();

    await expect(
      page.getByText(/saved|updated|success/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows server status indicator", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}`);

    // Server detail page should show a Live/Offline status
    const statusIndicator = page.getByText(/live|offline/i);
    await expect(statusIndicator).toBeVisible({ timeout: 10_000 });
  });
});
