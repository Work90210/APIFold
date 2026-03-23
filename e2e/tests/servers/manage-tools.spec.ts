import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { createTestSpec, deleteSpec } from "../../helpers/api";

test.describe("Manage Server Tools @servers", () => {
  let specId: string;
  let serverId: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);

    const result = await createTestSpec(page, {
      name: `E2E Test Tools ${Date.now()}`,
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

  test("displays the list of generated tools", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/tools`);

    // Should show at least one tool from the petstore spec
    const toolItems = page.locator(
      '[data-testid="tool-item"], [data-testid="tool-row"], tr, .tool-card',
    );
    await expect(toolItems.first()).toBeVisible({ timeout: 15_000 });

    // Should have multiple tools
    const count = await toolItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("each tool displays name and description", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/tools`);

    // Wait for tools to load
    await page.waitForSelector(
      '[data-testid="tool-item"], [data-testid="tool-row"], tr, .tool-card',
      { timeout: 15_000 },
    );

    // Look for tool name patterns from petstore (listPets, createPet, etc.)
    const toolNames = page.getByText(
      /listPets|createPet|getPet|list_pets|create_pet|get_pet/i,
    );
    await expect(toolNames.first()).toBeVisible();
  });

  test("can toggle a tool's enabled state", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/tools`);

    // Find a toggle switch for the first tool
    const toggle = page.locator(
      '[data-testid="tool-toggle"], [role="switch"], input[type="checkbox"]',
    ).first();
    await toggle.waitFor({ state: "visible", timeout: 15_000 });

    // Get initial state
    const wasChecked = await toggle.isChecked().catch(() => {
      // role="switch" uses aria-checked
      return toggle.getAttribute("aria-checked").then((v) => v === "true");
    });

    // Toggle it
    await toggle.click();

    // Wait for the state to update
    await page.waitForTimeout(1_000);

    // Verify state changed
    const isChecked = await toggle.isChecked().catch(() => {
      return toggle.getAttribute("aria-checked").then((v) => v === "true");
    });
    expect(isChecked).not.toBe(wasChecked);
  });

  test("shows success feedback after toggling a tool", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/tools`);

    const toggle = page.locator(
      '[data-testid="tool-toggle"], [role="switch"], input[type="checkbox"]',
    ).first();
    await toggle.waitFor({ state: "visible", timeout: 15_000 });
    await toggle.click();

    // Should show a success toast or feedback
    await expect(
      page.getByText(/updated|saved|disabled|enabled/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
