import { test, expect } from "@playwright/test";

test.describe("Basic Navigation @smoke", () => {
  test("should load the About page and show a CTA button", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1")).toContainText(/FAQ-RAG/i);

    const ctaButton = page.locator('a[href^="/chat/"]');
    await expect(ctaButton.first()).toBeVisible();
  });
});
