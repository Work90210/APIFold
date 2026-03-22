import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { cleanupTestSpecs, deleteSpec } from "../../helpers/api";

const PETSTORE_URL = "https://petstore3.swagger.io/api/v3/openapi.json";

test.describe("Import Spec from URL @specs", () => {
  let createdSpecId: string | null = null;

  test.beforeEach(async ({ page }) => {
    createdSpecId = null;
    const user = getTestUser();
    await ensureAuthenticated(page, user);
  });

  test.afterEach(async ({ page }) => {
    if (createdSpecId) {
      try {
        await deleteSpec(page, createdSpecId);
      } catch {
        // Best-effort
      }
      createdSpecId = null;
      return;
    }
    await cleanupTestSpecs(page);
  });

  test("navigates to the import page from specs list", async ({ page }) => {
    await page.goto("/dashboard/specs");

    const importButton = page.getByRole("link", { name: /import|new|add/i });
    await expect(importButton).toBeVisible();
    await importButton.click();

    await page.waitForURL("**/dashboard/specs/new**");
    await expect(
      page.getByText(/import api spec/i),
    ).toBeVisible();
  });

  test("imports a spec from a valid URL", async ({ page }) => {
    await page.goto("/dashboard/specs/new");

    // Step 1: Enter URL
    const urlInput = page.locator(
      '[data-testid="url-input"] input, input[placeholder*="URL"], input[type="url"]',
    );
    await urlInput.waitFor({ state: "visible", timeout: 10_000 });
    await urlInput.fill(PETSTORE_URL);

    const fetchButton = page.getByRole("button", {
      name: /fetch|load|submit/i,
    });
    await fetchButton.click();

    // Step 2: Preview operations — wait for them to appear
    await expect(
      page.getByText(/operations|endpoints|tools/i),
    ).toBeVisible({ timeout: 20_000 });

    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // Step 3: Confirm import
    const importButton = page.getByRole("button", { name: /import spec/i });
    await expect(importButton).toBeVisible();
    await importButton.click();

    // Should redirect to the spec detail page
    await page.waitForURL(/\/dashboard\/specs\/.+/, { timeout: 30_000 });
    createdSpecId = page.url().match(/\/dashboard\/specs\/([^/?#]+)/)?.[1] ?? null;
    await expect(page.getByText(/imported successfully/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows error for an invalid URL", async ({ page }) => {
    await page.goto("/dashboard/specs/new");

    const urlInput = page.locator(
      '[data-testid="url-input"] input, input[placeholder*="URL"], input[type="url"]',
    );
    await urlInput.waitFor({ state: "visible", timeout: 10_000 });
    await urlInput.fill("https://invalid.example.com/not-a-spec.json");

    const fetchButton = page.getByRole("button", {
      name: /fetch|load|submit/i,
    });
    await fetchButton.click();

    // Should show an error toast or inline error
    const error = page.locator(
      '[data-testid="error-message"], [role="alert"], .toast-error',
    );
    await expect(error).toBeVisible({ timeout: 15_000 });
  });
});
