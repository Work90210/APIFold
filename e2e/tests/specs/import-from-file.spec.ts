import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { cleanupTestSpecs } from "../../helpers/api";
import { getPetstoreFixturePath } from "../../helpers/api";

test.describe("Import Spec from File Upload @specs", () => {
  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestSpecs(page);
  });

  test("uploads a YAML spec file via the dropzone", async ({ page }) => {
    await page.goto("/dashboard/specs/new");

    // Find the file upload area
    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: "attached", timeout: 10_000 });

    // Upload the petstore fixture
    await fileInput.setInputFiles(getPetstoreFixturePath());

    // Should show the preview step with operations
    await expect(
      page.getByText(/operations|endpoints|tools/i),
    ).toBeVisible({ timeout: 15_000 });

    // Verify parsed spec name appears
    await expect(page.getByText(/petstore/i)).toBeVisible();
  });

  test("shows the correct operation count after file upload", async ({
    page,
  }) => {
    await page.goto("/dashboard/specs/new");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: "attached", timeout: 10_000 });
    await fileInput.setInputFiles(getPetstoreFixturePath());

    // Wait for preview — petstore.yaml has 3 operations (listPets, createPet, getPet)
    await expect(
      page.getByText(/operations|endpoints|tools/i),
    ).toBeVisible({ timeout: 15_000 });

    // Continue to confirm step
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // The confirm step should show the operation count
    await expect(page.getByText("3")).toBeVisible({ timeout: 5_000 });
  });

  test("completes full import flow from file upload", async ({ page }) => {
    await page.goto("/dashboard/specs/new");

    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: "attached", timeout: 10_000 });
    await fileInput.setInputFiles(getPetstoreFixturePath());

    // Wait for preview
    await expect(
      page.getByText(/operations|endpoints|tools/i),
    ).toBeVisible({ timeout: 15_000 });

    // Step 2: Continue
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // Step 3: Confirm import
    const importButton = page.getByRole("button", { name: /import spec/i });
    await expect(importButton).toBeVisible();
    await importButton.click();

    // Should redirect to the spec detail page
    await page.waitForURL(/\/dashboard\/specs\/.+/, { timeout: 30_000 });
  });
});
