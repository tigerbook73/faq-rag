import { test, expect } from "@playwright/test";

test.describe("Basic Navigation @smoke", () => {
  test("should load the About page and show a CTA button", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1")).toContainText(/FAQ-RAG/i);

    // Check for either "Sign In" or "Go to Chat"
    const ctaButton = page.locator('a[href="/auth/signin"], a[href^="/chat/"]');
    await expect(ctaButton.first()).toBeVisible();
  });
});
