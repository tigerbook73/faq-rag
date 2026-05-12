import { test as base, expect, type Browser, type Page } from "@playwright/test";
import path from "path";

const authDir = path.join(__dirname, "..", ".auth");

async function withAuthenticatedPage(browser: Browser, stateFile: string, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ storageState: path.join(authDir, stateFile) });
  const page = await context.newPage();
  await run(page);
  await context.close();
}

export const test = base.extend<{
  adminPage: Page;
  user1Page: Page;
  user2Page: Page;
}>({
  adminPage: async ({ browser }, run) => {
    await withAuthenticatedPage(browser, "admin.json", run);
  },
  user1Page: async ({ browser }, run) => {
    await withAuthenticatedPage(browser, "user1.json", run);
  },
  user2Page: async ({ browser }, run) => {
    await withAuthenticatedPage(browser, "user2.json", run);
  },
});

export { expect };
