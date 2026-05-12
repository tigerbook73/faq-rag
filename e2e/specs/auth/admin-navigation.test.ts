import { test, expect } from "../../fixtures/auth";
import { signInOnCurrentPage } from "../../helpers";

test.describe("multi-user admin navigation", () => {
  test("admin default login lands on dashboard and from target is respected", async ({ page }) => {
    await page.goto("/auth/signin");
    await signInOnCurrentPage(page, "admin", "/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.context().clearCookies();

    await page.goto("/knowledge");
    await signInOnCurrentPage(page, "admin", "/knowledge");
    await expect(page.getByRole("tab", { name: "My documents" })).toBeVisible();
  });

  test("admin can switch between admin and user shells", async ({ adminPage }) => {
    await adminPage.goto("/admin");
    await expect(adminPage.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await adminPage.getByRole("button", { name: "Go to Chat" }).click();
    await expect(adminPage).toHaveURL((url) => url.pathname.startsWith("/chat"));

    await adminPage.getByRole("button", { name: "Admin Portal" }).click();
    await expect(adminPage).toHaveURL((url) => url.pathname === "/admin");
    await expect(adminPage.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
