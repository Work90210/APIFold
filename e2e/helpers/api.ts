import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE_URL = process.env["BASE_URL"] ?? "http://localhost:3000";

interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: string;
}

interface Spec {
  readonly id: string;
  readonly name: string;
  readonly version: string;
}

interface Server {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly specId: string;
}

interface CreateSpecResult {
  readonly spec: Spec;
  readonly server: Server;
}

/**
 * Make an authenticated API call by extracting cookies from the page context.
 */
async function apiCall<T>(
  page: Page,
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const cookies = await page.context().cookies();
  const cookieHeader = cookies
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !json.success) {
    throw new Error(
      `API ${method} ${endpoint} failed: ${json.error ?? response.statusText}`,
    );
  }

  return json.data;
}

/**
 * Load the petstore test spec YAML as a parsed object.
 */
function loadPetstoreSpec(): Record<string, unknown> {
  const yamlPath = path.resolve(__dirname, "../fixtures/petstore.yaml");
  const content = readFileSync(yamlPath, "utf-8");

  // Simple YAML-to-JSON: import the spec via the API using sourceUrl instead
  // For file upload tests, we return the raw string
  return { _raw: content } as unknown as Record<string, unknown>;
}

/**
 * Create a test spec + server via the API for test setup.
 */
export async function createTestSpec(
  page: Page,
  options?: { readonly name?: string },
): Promise<CreateSpecResult> {
  const name = options?.name ?? `E2E Test Spec ${Date.now()}`;

  return apiCall<CreateSpecResult>(page, "POST", "/api/specs", {
    name,
    version: "1.0.0",
    sourceUrl: "https://petstore3.swagger.io/api/v3/openapi.json",
  });
}

/**
 * Delete a spec by ID (cascading to server + tools).
 */
export async function deleteSpec(page: Page, specId: string): Promise<void> {
  await apiCall(page, "DELETE", `/api/specs/${specId}`);
}

/**
 * Delete a server by ID.
 */
export async function deleteServer(
  page: Page,
  serverId: string,
): Promise<void> {
  await apiCall(page, "DELETE", `/api/servers/${serverId}`);
}

/**
 * List all specs for the current user.
 */
export async function listSpecs(page: Page): Promise<readonly Spec[]> {
  return apiCall<readonly Spec[]>(page, "GET", "/api/specs");
}

/**
 * Get server details by ID.
 */
export async function getServer(
  page: Page,
  serverId: string,
): Promise<Server> {
  return apiCall<Server>(page, "GET", `/api/servers/${serverId}`);
}

/**
 * Update server configuration.
 */
export async function updateServer(
  page: Page,
  serverId: string,
  updates: Record<string, unknown>,
): Promise<Server> {
  return apiCall<Server>(page, "PATCH", `/api/servers/${serverId}`, updates);
}

/**
 * Get the path to the petstore.yaml fixture file.
 */
export function getPetstoreFixturePath(): string {
  return path.resolve(__dirname, "../fixtures/petstore.yaml");
}

/**
 * Clean up all test specs created during a test run.
 * Matches specs with names starting with "E2E Test".
 */
export async function cleanupTestSpecs(page: Page): Promise<void> {
  try {
    const specs = await listSpecs(page);
    const testSpecs = specs.filter((s) => s.name.startsWith("E2E Test"));

    for (const spec of testSpecs) {
      try {
        await deleteSpec(page, spec.id);
      } catch {
        // Best-effort cleanup — don't fail the test
      }
    }
  } catch {
    // If listing fails (e.g., not authenticated), skip cleanup
  }
}
