import { test, expect } from "@playwright/test";

test.describe("Basic Navigation", () => {
  test("should load the About page and show a CTA button", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1")).toContainText(/FAQ-RAG/i);

    // Check for either "Sign In" or "Go to Chat"
    const ctaButton = page.locator('a[href="/auth/signin"], a[href^="/chat/"]');
    await expect(ctaButton.first()).toBeVisible();
  });

  test("signin page shows all default demo accounts", async ({ page }) => {
    await page.goto("/auth/signin");

    await expect(page.getByText("admin@test.com / admin@123")).toBeVisible();
    await expect(page.getByText("user1@test.com / user1@123")).toBeVisible();
    await expect(page.getByText("user2@test.com / user2@123")).toBeVisible();
  });
});
