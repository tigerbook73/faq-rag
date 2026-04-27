import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Knowledge base", () => {
  test("upload a document and wait for it to be indexed", async ({ page }) => {
    await page.goto("/knowledge");

    // Upload the fixture file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures/sample.txt"));

    // The upload zone shows progress then a toast; wait for the document to appear in the table
    await expect(page.getByText("sample.txt")).toBeVisible({ timeout: 15_000 });

    // Poll until the row for sample.txt shows "indexed" text (shadcn Badge is a plain div, no role)
    const row = page.locator("tr", { hasText: "sample.txt" });
    await expect(row.getByText("indexed")).toBeVisible({ timeout: 60_000 });
  });
});
