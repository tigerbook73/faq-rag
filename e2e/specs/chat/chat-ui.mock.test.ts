import { test, expect } from "@playwright/test";
import { signIn } from "../../helpers";
import { mockChatRoute } from "../../mocks/chat";

test.describe("Chat UI (mocked API)", () => {
  test.beforeEach(async ({ page }) => {
    await mockChatRoute(page);
  });

  test("sends a message and receives a mocked streamed response @smoke", async ({ page }) => {
    await signIn(page, "user1", "/chat/last");
    await page.goto("/chat/new");

    const input = page.getByPlaceholder(/ask/i).or(page.locator("textarea")).first();
    await input.fill("How many vacation days?");
    await input.press("Control+Enter");

    await expect(page.getByRole("button", { name: "Send" })).toBeEnabled({ timeout: 15_000 });

    const assistantBubble = page.locator('[data-role="assistant"]').last();
    await expect(assistantBubble).toContainText("15 vacation days", { timeout: 5_000 });
  });

  test("citation superscript is rendered and opens CitationDrawer on click", async ({ page }) => {
    await signIn(page, "user1", "/chat/last");
    await page.goto("/chat/new");

    const input = page.getByPlaceholder(/ask/i).or(page.locator("textarea")).first();
    await input.fill("How many vacation days?");
    await input.press("Control+Enter");

    await page.waitForURL((url) => url.pathname.startsWith("/chat/") && url.pathname !== "/chat/new", {
      timeout: 15_000,
    });

    await expect(page.getByRole("button", { name: "Send" })).toBeEnabled({ timeout: 15_000 });

    const citation = page.locator("sup").first();
    await expect(citation).toBeVisible({ timeout: 5_000 });

    await citation.locator("button").first().dispatchEvent("click");

    const drawer = page.locator('[role="dialog"]').first();
    await expect(drawer).toBeVisible({ timeout: 5_000 });
    await expect(drawer).not.toBeEmpty();
  });
});
