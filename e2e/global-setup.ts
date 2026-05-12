import { chromium, type FullConfig } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { signIn, type DemoAccount } from "./helpers";

function validateProdEnv(baseURL: string) {
  if (process.env.E2E_ENV !== "prod") return;

  if (!process.env.E2E_BASE_URL) {
    throw new Error("E2E_ENV=prod requires E2E_BASE_URL to be set.");
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(baseURL)) {
    throw new Error(`E2E_ENV=prod: E2E_BASE_URL must not point to localhost ("${baseURL}").`);
  }

  const allowlist = (process.env.E2E_PROD_URL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.some((allowed) => baseURL.startsWith(allowed))) {
    throw new Error(`E2E_ENV=prod: E2E_BASE_URL "${baseURL}" is not in E2E_PROD_URL_ALLOWLIST.`);
  }
}

const AUTH_DIR = path.join(__dirname, ".auth");

const STORAGE_STATE: Record<DemoAccount, string> = {
  admin: path.join(AUTH_DIR, "admin.json"),
  user1: path.join(AUTH_DIR, "user1.json"),
  user2: path.join(AUTH_DIR, "user2.json"),
};

function getAuthAccounts() {
  const raw = process.env.E2E_AUTH_ACCOUNTS;
  if (!raw) return Object.keys(STORAGE_STATE) as DemoAccount[];

  return raw.split(",").map((account) => {
    const trimmed = account.trim();
    if (!(trimmed in STORAGE_STATE)) {
      throw new Error(`Unknown E2E auth account: ${trimmed}`);
    }
    return trimmed as DemoAccount;
  });
}

async function globalSetup(config: FullConfig) {
  const project = config.projects[0];
  const baseURL = (project.use.baseURL as string | undefined) ?? "http://localhost:3000";

  validateProdEnv(baseURL);

  const accounts = getAuthAccounts();

  await fs.mkdir(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const account of accounts) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      await signIn(page, account);
      await context.storageState({ path: STORAGE_STATE[account] });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

export default globalSetup;
