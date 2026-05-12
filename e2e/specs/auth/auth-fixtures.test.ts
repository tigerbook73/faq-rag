import { test, expect } from "../../fixtures/auth";

test.describe("multi-user auth fixtures", () => {
  test("loads admin storage state", async ({ adminPage }) => {
    await adminPage.goto("/admin");
    await expect(adminPage.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("loads user1 storage state", async ({ user1Page }) => {
    await user1Page.goto("/chat/last");
    await expect(user1Page).toHaveURL((url) => url.pathname.startsWith("/chat"));
  });

  test("loads user2 storage state", async ({ user2Page }) => {
    await user2Page.goto("/chat/last");
    await expect(user2Page).toHaveURL((url) => url.pathname.startsWith("/chat"));
  });
});
