import type { FullConfig } from "@playwright/test";

const HEALTH_URL = process.env["BASE_URL"]
  ? `${process.env["BASE_URL"]}/api/health`
  : "http://localhost:3000/api/health";

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2_000;

async function waitForApp(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(HEALTH_URL, {
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        console.log(`[global-setup] App is ready (attempt ${attempt})`);
        return;
      }
    } catch {
      // App not ready yet
    }

    if (attempt < MAX_RETRIES) {
      console.log(
        `[global-setup] Waiting for app... (attempt ${attempt}/${MAX_RETRIES})`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw new Error(
    `[global-setup] App at ${HEALTH_URL} did not become ready after ${MAX_RETRIES} attempts`,
  );
}

function validateEnv(): void {
  const required = ["CLERK_TEST_EMAIL", "CLERK_TEST_PASSWORD"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `[global-setup] Missing env vars: ${missing.join(", ")}. Auth tests will be skipped.`,
    );
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  console.log("[global-setup] Starting global setup...");
  validateEnv();
  await waitForApp();
  console.log("[global-setup] Global setup complete.");
}
