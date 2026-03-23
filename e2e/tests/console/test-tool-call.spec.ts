import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { createTestSpec, deleteSpec } from "../../helpers/api";

test.describe("Console Tool Execution @console", () => {
  let specId: string | null = null;
  let serverId: string | null = null;

  test.beforeEach(async ({ page }) => {
    specId = null;
    serverId = null;
    const user = getTestUser();
    await ensureAuthenticated(page, user);

    const result = await createTestSpec(page, {
      name: `E2E Test Console ${Date.now()}`,
    });
    specId = result.spec.id;
    serverId = result.server.id;
  });

  test.afterEach(async ({ page }) => {
    try {
      if (specId) {
        await deleteSpec(page, specId);
      }
    } catch {
      // Best-effort cleanup
    }
  });

  test("navigates to the console page", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/console`);

    // Console page should have a tool selector or input area
    await expect(
      page.getByText(/console|test|execute/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays available tools in the console", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/console`);

    // Should list tools from the imported spec
    const toolSelector = page.locator(
      '[data-testid="tool-selector"], select, [role="combobox"]',
    ).first();
    await expect(toolSelector).toBeVisible({ timeout: 15_000 });
  });

  test("executes a tool call and displays the response", async ({ page }) => {
    await page.goto(`/dashboard/servers/${serverId}/console`);

    // Select a tool (e.g., listPets which requires no params)
    const toolSelector = page.locator(
      '[data-testid="tool-selector"], select, [role="combobox"]',
    ).first();
    await toolSelector.waitFor({ state: "visible", timeout: 15_000 });
    await toolSelector.click();

    // Select the first available tool
    const toolOption = page.locator(
      '[data-testid="tool-option"], option, [role="option"]',
    ).first();
    await toolOption.click();

    // Click execute/run button
    const executeButton = page.getByRole("button", {
      name: /execute|run|send|test/i,
    });
    await expect(executeButton).toBeVisible();
    await executeButton.click();

    // Wait for the response to appear
    const responseArea = page.locator(
      '[data-testid="tool-response"], [data-testid="response-output"], pre, .response-panel',
    );
    await expect(responseArea.first()).toBeVisible({ timeout: 30_000 });

    // Response should contain JSON or some structured output
    const responseText = await responseArea.first().textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(0);
  });

  test("shows error for tool call with missing required parameters", async ({
    page,
  }) => {
    await page.goto(`/dashboard/servers/${serverId}/console`);

    const toolSelector = page.locator(
      '[data-testid="tool-selector"], select, [role="combobox"]',
    ).first();
    await toolSelector.waitFor({ state: "visible", timeout: 15_000 });

    // Try to execute without selecting a tool or filling params
    const executeButton = page.getByRole("button", {
      name: /execute|run|send|test/i,
    });

    if (await executeButton.isEnabled()) {
      await executeButton.click();

      // Should show validation error or error response
      const error = page.locator(
        '[data-testid="error-message"], [role="alert"], .text-destructive',
      );
      await expect(error.first()).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(executeButton).toBeDisabled();
    }
  });
});
