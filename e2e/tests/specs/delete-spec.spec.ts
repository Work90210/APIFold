import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { createTestSpec, listSpecs } from "../../helpers/api";

test.describe("Delete Spec @specs", () => {
  let specId: string;
  let serverId: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);

    // Create a test spec to delete
    const result = await createTestSpec(page, {
      name: `E2E Test Delete ${Date.now()}`,
    });
    specId = result.spec.id;
    serverId = result.server.id;
  });

  test("deletes a spec from the spec detail page", async ({ page }) => {
    await page.goto(`/dashboard/specs/${specId}`);

    // Find and click the delete button
    const deleteButton = page.getByRole("button", { name: /delete/i });
    await expect(deleteButton).toBeVisible({ timeout: 10_000 });
    await deleteButton.click();

    // Confirm deletion in the dialog
    const confirmButton = page.locator(
      '[data-testid="confirm-delete"], [role="alertdialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Delete")',
    );
    await expect(confirmButton).toBeVisible({ timeout: 5_000 });
    await confirmButton.click();

    // Should redirect back to specs list
    await page.waitForURL("**/dashboard/specs", { timeout: 15_000 });

    // The deleted spec should no longer appear in the list
    await expect(page.getByText(new RegExp(specId))).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("cascading delete removes the associated server", async ({ page }) => {
    await page.goto(`/dashboard/specs/${specId}`);

    const deleteButton = page.getByRole("button", { name: /delete/i });
    await deleteButton.click();

    const confirmButton = page.locator(
      '[data-testid="confirm-delete"], [role="alertdialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Delete")',
    );
    await confirmButton.click();

    await page.waitForURL("**/dashboard/specs", { timeout: 15_000 });

    // Navigate to servers page — the associated server should be gone
    await page.goto("/dashboard/servers");
    await expect(
      page.getByText(new RegExp(serverId)),
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("cancel button in delete dialog does not delete the spec", async ({
    page,
  }) => {
    await page.goto(`/dashboard/specs/${specId}`);

    const deleteButton = page.getByRole("button", { name: /delete/i });
    await deleteButton.click();

    // Click cancel in the confirmation dialog
    const cancelButton = page.locator(
      '[role="alertdialog"] button:has-text("Cancel"), [role="dialog"] button:has-text("Cancel")',
    );
    await cancelButton.click();

    // Should still be on the spec detail page
    expect(page.url()).toContain(`/dashboard/specs/${specId}`);

    // Verify spec still exists in the API
    const specs = await listSpecs(page);
    const found = specs.some((s) => s.id === specId);
    expect(found).toBe(true);
  });
});
