import { test, expect } from "@playwright/test";

test.describe("Sign in @smoke", () => {
  test("signin page shows all default demo accounts", async ({ page }) => {
    await page.goto("/auth/signin");

    await expect(page.getByText("admin@test.com / admin@123")).toBeVisible();
    await expect(page.getByText("user1@test.com / user1@123")).toBeVisible();
    await expect(page.getByText("user2@test.com / user2@123")).toBeVisible();
  });
});
