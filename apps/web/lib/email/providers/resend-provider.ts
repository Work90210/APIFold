import { getResend } from "../resend-client";
import type {
  EmailProvider,
  ProviderSendInput,
  ProviderSendResult,
} from "../provider";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const SEND_TIMEOUT_MS = 10_000;

function classifyResendError(error: {
  statusCode?: number;
  name?: string;
  message?: string;
}): ProviderSendResult {
  const code = error.statusCode ?? 0;
  const retryable =
    RETRYABLE_STATUS_CODES.has(code) ||
    error.name === "fetch_error" ||
    error.name === "network_error";

  return Object.freeze({
    ok: false as const,
    retryable,
    code: error.name ?? `status_${code}`,
    message: error.message ?? "Unknown Resend error",
    raw: error,
  });
}

export function createResendProvider(): EmailProvider {
  return {
    async send(input: ProviderSendInput): Promise<ProviderSendResult> {
      const resend = getResend();

      const sendPromise = resend.emails.send({
        from: input.from,
        to: input.to,
        subject: input.subject,
        react: input.react,
        headers: input.headers,
        tags: input.tags as Array<{ name: string; value: string }>,
      });

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Resend send timed out after ${SEND_TIMEOUT_MS}ms`)),
          SEND_TIMEOUT_MS,
        );
      });

      let result: Awaited<ReturnType<typeof resend.emails.send>>;
      try {
        result = await Promise.race([sendPromise, timeoutPromise]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("timed out")) {
          return classifyResendError({
            name: "timeout",
            message,
          });
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }

      if (result.error) {
        return classifyResendError(
          result.error as {
            statusCode?: number;
            name?: string;
            message?: string;
          },
        );
      }

      return Object.freeze({
        ok: true as const,
        providerMessageId: result.data?.id ?? "",
        raw: result.data,
      });
    },
  };
}
