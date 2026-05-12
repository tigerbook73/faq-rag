import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isRemote = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e/specs",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: isRemote
    ? undefined
    : {
        command: "pnpm dev",
        url: `${baseURL}/about`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
