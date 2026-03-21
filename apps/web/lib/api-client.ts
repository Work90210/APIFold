import type { ApiResponse } from "@apifold/types";

const ERROR_TEMPLATES: Record<string, { readonly why: string; readonly fix: string }> = {
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

const STATUS_TEMPLATES: Record<number, { readonly why: string; readonly fix: string }> = {
  401: ERROR_TEMPLATES.UNAUTHORIZED!,
  403: ERROR_TEMPLATES.FORBIDDEN!,
  404: ERROR_TEMPLATES.NOT_FOUND!,
  409: ERROR_TEMPLATES.CONFLICT!,
  422: ERROR_TEMPLATES.VALIDATION_ERROR!,
  429: ERROR_TEMPLATES.RATE_LIMITED!,
};

/**
 * Builds a user-friendly error message following the formula:
 * What happened + Why it happened + How to fix it
 */
function buildErrorMessage(code: string, serverMessage: string, status: number): string {
  const template = ERROR_TEMPLATES[code] ?? STATUS_TEMPLATES[status] ?? (
    status >= 500
      ? ERROR_TEMPLATES.SERVER_ERROR!
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
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
