import { Resend } from "resend";

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (resendInstance) return resendInstance;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY environment variable is required. " +
        "Set it in your .env.local file.",
    );
  }

  resendInstance = new Resend(apiKey);
  return resendInstance;
}
