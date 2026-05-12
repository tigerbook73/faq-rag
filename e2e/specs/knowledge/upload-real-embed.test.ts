import { test, expect } from "@playwright/test";
import path from "path";
import { signIn } from "../../helpers";

test.describe("Knowledge base @embed @slow", () => {
  test("upload a document and show it in the document table", async ({ page }) => {
    await signIn(page, "user1", "/chat/last");
    await page.goto("/knowledge");

    // Upload the fixture file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "../../fixtures/sample.txt"));

    // The indexing worker can lag in local e2e; this verifies the upload is accepted and listed.
    const row = page.locator("tr:visible", { hasText: "sample.txt" });
    await expect(row.getByRole("cell", { name: "sample.txt", exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("cell", { name: /^(uploaded|indexing|indexed)$/ })).toBeVisible({ timeout: 15_000 });
  });
});
