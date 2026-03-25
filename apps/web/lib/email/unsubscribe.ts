import { createHmac, timingSafeEqual } from "crypto";
import { getAppUrl } from "@/lib/url";
import type { EmailType } from "./types";

const UNSUBSCRIBE_EXPIRY_DAYS = 30;

function getSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("EMAIL_UNSUBSCRIBE_SECRET environment variable is required");
  }
  return secret;
}

export type UnsubscribeScope =
  | "weekly_usage_summary"
  | "monthly_usage_summary"
  | "renewal_reminder"
  | "usage_limit_warning"
  | "budget_cap_warning"
  | "overage_alert";

/** Maps EmailType to the unsubscribe scope it belongs to */
export function emailTypeToScope(type: EmailType): UnsubscribeScope | null {
  const mapping: Partial<Record<EmailType, UnsubscribeScope>> = {
    weekly_usage_summary: "weekly_usage_summary",
    monthly_usage_summary: "monthly_usage_summary",
    renewal_reminder: "renewal_reminder",
    usage_limit_warning: "usage_limit_warning",
    budget_cap_warning: "budget_cap_warning",
    overage_alert: "overage_alert",
  };
  return mapping[type] ?? null;
}

interface TokenPayload {
  readonly userId: string;
  readonly scope: UnsubscribeScope;
  readonly exp: number;
}

export function createUnsubscribeToken(
  userId: string,
  scope: UnsubscribeScope,
): string {
  const exp = Math.floor(Date.now() / 1000) + UNSUBSCRIBE_EXPIRY_DAYS * 86400;
  const payload: TokenPayload = { userId, scope, exp };
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data, "utf-8").toString("base64url");
  const signature = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expectedSig = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expectedSig, "base64url");

  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const data = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8"),
    ) as TokenPayload;

    if (data.exp < Math.floor(Date.now() / 1000)) return null;

    return Object.freeze(data);
  } catch {
    return null;
  }
}

export function createUnsubscribeUrl(
  userId: string,
  scope: UnsubscribeScope,
): string {
  const token = createUnsubscribeToken(userId, scope);
  return `${getAppUrl()}/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function createUnsubscribeHeaders(
  userId: string,
  emailType: EmailType,
): Record<string, string> {
  const scope = emailTypeToScope(emailType);
  if (!scope) return {};

  const url = createUnsubscribeUrl(userId, scope);
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
