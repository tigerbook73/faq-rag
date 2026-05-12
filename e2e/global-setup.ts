import { chromium, type FullConfig } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import { signIn, type DemoAccount } from "./helpers";

const AUTH_DIR = path.join(__dirname, ".auth");

const STORAGE_STATE: Record<DemoAccount, string> = {
  admin: path.join(AUTH_DIR, "admin.json"),
  user1: path.join(AUTH_DIR, "user1.json"),
  user2: path.join(AUTH_DIR, "user2.json"),
};

async function globalSetup(config: FullConfig) {
  const project = config.projects[0];
  const baseURL = (project.use.baseURL as string | undefined) ?? "http://localhost:3000";

  await fs.mkdir(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const account of Object.keys(STORAGE_STATE) as DemoAccount[]) {
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
