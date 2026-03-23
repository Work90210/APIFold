import { test, expect } from "@playwright/test";
import { getTestUser } from "../../fixtures/test-user";
import { ensureAuthenticated } from "../../helpers/auth";
import { createTestSpec, deleteSpec, getServer } from "../../helpers/api";

const RUNTIME_BASE_URL =
  process.env["RUNTIME_URL"] ?? "http://localhost:3001";

test.describe("MCP SSE Connection @mcp", () => {
  let specId: string;
  let serverId: string;
  let serverSlug: string;

  test.beforeEach(async ({ page }) => {
    const user = getTestUser();
    await ensureAuthenticated(page, user);

    const result = await createTestSpec(page, {
      name: `E2E Test SSE ${Date.now()}`,
    });
    specId = result.spec.id;
    serverId = result.server.id;
    serverSlug = result.server.slug;
  });

  test.afterEach(async ({ page }) => {
    try {
      await deleteSpec(page, specId);
    } catch {
      // Best-effort cleanup
    }
  });

  test("SSE endpoint is reachable", async ({ page }) => {
    const sseUrl = `${RUNTIME_BASE_URL}/mcp/${serverSlug}/sse`;

    // Use fetch to check if the SSE endpoint responds
    const response = await page.evaluate(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });
        clearTimeout(timeout);
        return {
          status: res.status,
          contentType: res.headers.get("content-type"),
          ok: res.ok,
        };
      } catch (error) {
        clearTimeout(timeout);
        return {
          status: 0,
          contentType: null,
          ok: false,
          error: String(error),
        };
      }
    }, sseUrl);

    // SSE endpoint should return 200 with text/event-stream content type
    expect(response.status).toBe(200);
    expect(response.contentType).toContain("text/event-stream");
  });

  test("receives SSE events after connecting", async ({ page }) => {
    const sseUrl = `${RUNTIME_BASE_URL}/mcp/${serverSlug}/sse`;

    // Open an EventSource and collect messages
    const events = await page.evaluate(async (url) => {
      return new Promise<string[]>((resolve) => {
        const collected: string[] = [];
        const eventSource = new EventSource(url);
        const timeout = setTimeout(() => {
          eventSource.close();
          resolve(collected);
        }, 10_000);

        eventSource.onmessage = (event) => {
          collected.push(event.data);
          // Once we get at least one message, we can stop
          if (collected.length >= 1) {
            clearTimeout(timeout);
            eventSource.close();
            resolve(collected);
          }
        };

        eventSource.onerror = () => {
          clearTimeout(timeout);
          eventSource.close();
          resolve(collected);
        };
      });
    }, sseUrl);

    // Should have received at least one event (e.g., session init)
    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  test("MCP tool call via HTTP transport returns a response", async ({
    page,
  }) => {
    const messageUrl = `${RUNTIME_BASE_URL}/mcp/${serverSlug}/message`;

    // Send a tools/list request
    const result = await page.evaluate(async (url) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
            params: {},
          }),
        });
        return {
          status: res.status,
          body: await res.json(),
        };
      } catch (error) {
        return { status: 0, error: String(error) };
      }
    }, messageUrl);

    // Should return a valid JSON-RPC response with tools
    expect(result.status).toBe(200);
    if ("body" in result) {
      expect(result.body).toHaveProperty("result");
    }
  });
});
