import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const isCI = !!process.env["CI"];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],
  globalSetup: path.resolve(__dirname, "global-setup.ts"),

  use: {
    baseURL: process.env["BASE_URL"] ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
