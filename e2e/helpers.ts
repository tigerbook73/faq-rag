import { expect, type Page } from "@playwright/test";

const ACCOUNTS = {
  admin: { email: "admin@test.com", password: "admin@123" },
  user1: { email: "user1@test.com", password: "user1@123" },
  user2: { email: "user2@test.com", password: "user2@123" },
} as const;

export type DemoAccount = keyof typeof ACCOUNTS;

export async function signIn(page: Page, account: DemoAccount, expectedPath?: string | RegExp) {
  const credentials = ACCOUNTS[account];

  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  if (expectedPath instanceof RegExp) {
    await page.waitForURL((url) => expectedPath.test(url.pathname), { timeout: 15_000 });
  } else if (expectedPath) {
    await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 15_000 });
  } else {
    await expect(page).not.toHaveURL(/\/auth\/signin/);
  }
}

export async function signInOnCurrentPage(page: Page, account: DemoAccount, expectedPath: string | RegExp) {
  const credentials = ACCOUNTS[account];

  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  if (expectedPath instanceof RegExp) {
    await page.waitForURL((url) => expectedPath.test(url.pathname), { timeout: 15_000 });
  } else {
    await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 15_000 });
  }
}
