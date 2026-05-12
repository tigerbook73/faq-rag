import { test, expect } from "@playwright/test";
import { signIn, signInOnCurrentPage } from "./helpers";

test.describe("Site separation @smoke", () => {
  test("anonymous users are redirected to the unified sign-in page with from", async ({ page }) => {
    await page.goto("/chat/last");
    await expect(page).toHaveURL(
      (url) => url.pathname === "/auth/signin" && url.searchParams.get("from") === "/chat/last",
    );

    await page.goto("/admin");
    await expect(page).toHaveURL((url) => url.pathname === "/auth/signin" && url.searchParams.get("from") === "/admin");
  });

  test("role=user signs in to the user home by default", async ({ page }) => {
    await signIn(page, "user1", "/chat/last");
    await expect(page.getByRole("link", { name: "Knowledge" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Admin Portal" })).toHaveCount(0);
  });

  test("role=admin signs in to the admin home by default", async ({ page }) => {
    await signIn(page, "admin", "/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("role=user cannot use an admin from target and sees admin 403", async ({ page }) => {
    await page.goto("/admin");
    await signInOnCurrentPage(page, "user1", "/chat/last");

    await page.goto("/admin");
    await expect(page).toHaveURL((url) => url.pathname === "/admin");
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();

    const res = await page.request.get("/api/admin/users");
    expect(res.status()).toBe(403);
  });

  test("role=admin can access admin and user sites", async ({ page }) => {
    await signIn(page, "admin", "/admin");
    await page.goto("/admin/about");
    await expect(page.getByRole("heading", { name: "Admin About" })).toBeVisible();

    await page.goto("/chat/last");
    await expect(page.getByRole("button", { name: "Admin Portal" })).toBeVisible();
  });

  test("signout clears the session and returns to sign-in", async ({ page }) => {
    await signIn(page, "admin", "/admin");
    await page.getByRole("button", { name: /Sign out/ }).click();
    await page.waitForURL((url) => url.pathname === "/auth/signin", { timeout: 15_000 });

    await page.goto("/admin");
    await expect(page).toHaveURL((url) => url.pathname === "/auth/signin" && url.searchParams.get("from") === "/admin");
  });
});
