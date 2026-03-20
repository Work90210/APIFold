import type { ApiResponse } from "@apifold/types";

/**
 * Builds a user-friendly error message following the formula:
 * What happened + Why it happened + How to fix it
 */
function buildErrorMessage(code: string, serverMessage: string, status: number): string {
  const errorTemplates: Record<string, { why: string; fix: string }> = {
    NOT_FOUND: {
      why: "The requested resource could not be found.",
      fix: "Check the URL or ID you used and try again.",
    },
    UNAUTHORIZED: {
      why: "Your session has expired or you are not signed in.",
      fix: "Sign in again to continue.",
    },
    FORBIDDEN: {
      why: "You don't have permission to perform this action.",
      fix: "Contact your account administrator for access.",
    },
    VALIDATION_ERROR: {
      why: "The data you submitted is invalid.",
      fix: "Review the highlighted fields and correct any errors.",
    },
    RATE_LIMITED: {
      why: "Too many requests were sent in a short time.",
      fix: "Wait a moment and try again.",
    },
    CONFLICT: {
      why: "This action conflicts with the current state of the resource.",
      fix: "Refresh the page to see the latest data, then try again.",
    },
    SERVER_ERROR: {
      why: "Something went wrong on our end.",
      fix: "Try again in a few moments. If the problem persists, contact support.",
    },
  };

  const statusTemplates: Record<number, { why: string; fix: string }> = {
    401: errorTemplates.UNAUTHORIZED!,
    403: errorTemplates.FORBIDDEN!,
    404: errorTemplates.NOT_FOUND!,
    409: errorTemplates.CONFLICT!,
    422: errorTemplates.VALIDATION_ERROR!,
    429: errorTemplates.RATE_LIMITED!,
  };

  const template = errorTemplates[code] ?? statusTemplates[status] ?? (
    status >= 500
      ? errorTemplates.SERVER_ERROR!
      : { why: serverMessage, fix: "Try again or contact support if the issue persists." }
  );

  return `${serverMessage} ${template.why} ${template.fix}`;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new ApiError(
      "SERVER_ERROR",
      buildErrorMessage(
        "SERVER_ERROR",
        `Server returned an unexpected response (${res.status}).`,
        res.status,
      ),
      res.status,
    );
  }

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new ApiError(
      json.error.code,
      buildErrorMessage(json.error.code, json.error.message, res.status),
      res.status,
    );
  }

  return json.data;
}

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let fetchUrl = `${this.baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      fetchUrl = `${fetchUrl}?${searchParams.toString()}`;
    }

    const res = await fetch(fetchUrl, {
      credentials: "include",
    });

    return parseResponse<T>(res);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.mutate<T>("POST", path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.mutate<T>("PUT", path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.mutate<T>("PATCH", path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.mutate<T>("DELETE", path);
  }

  private async mutate<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    return parseResponse<T>(res);
  }
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = new ApiClient();
