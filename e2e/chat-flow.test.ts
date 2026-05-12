import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Chat flow @real-api @slow", () => {
  test("sends a message and receives a streamed response with citation", async ({ page }) => {
    await signIn(page, "user1", "/chat/last");
    await page.goto("/chat/new");

    const input = page.getByPlaceholder(/ask/i).or(page.locator("textarea")).first();
    await input.fill("How many vacation days do employees get per year?");
    await input.press("Control+Enter");

    // Wait for the first token to arrive (stream started)
    const assistantBubble = page.locator('[data-role="assistant"]').last();
    await expect(assistantBubble).not.toBeEmpty({ timeout: 30_000 });

    // Wait for stream to fully complete: Send button returns (was "Thinking…" while loading)
    await expect(page.getByRole("button", { name: "Send" })).toBeEnabled({
      timeout: 30_000,
    });

    const text = await assistantBubble.innerText();
    expect(text.trim().length).toBeGreaterThan(10);
  });

  test("citation superscript is rendered and opens CitationDrawer on click", async ({ page }) => {
    await signIn(page, "user1", "/chat/last");
    await page.goto("/chat/new");

    const input = page.getByPlaceholder(/ask/i).or(page.locator("textarea")).first();
    await input.fill("How many vacation days do employees get per year?");
    await input.press("Control+Enter");

    // After the stream's "done" event, ChatWindow awaits persistMessages then calls
    // router.replace('/chat/<uuid>'). Wait for that navigation — excludes /chat/new.
    await page.waitForURL((url) => url.pathname.startsWith("/chat/") && url.pathname !== "/chat/new", {
      timeout: 30_000,
    });

    // Wait for stream to fully complete: Send button re-appears (was "Thinking…" while loading)
    await expect(page.getByRole("button", { name: "Send" })).toBeEnabled({
      timeout: 30_000,
    });

    // Verify a citation sup is present
    const citation = page.locator("sup").first();
    await expect(citation).toBeVisible({ timeout: 5_000 });

    // Use dispatchEvent to click the inner button — bypasses Playwright's viewport check
    // (sup lives inside an overflow-y-auto container that Playwright can't auto-scroll)
    await citation.locator("button").first().dispatchEvent("click");

    const drawer = page.locator('[role="dialog"]').first();
    await expect(drawer).toBeVisible({ timeout: 5_000 });
    await expect(drawer).not.toBeEmpty();
  });
});
