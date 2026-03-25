import type { ReactElement } from "react";

export type ProviderSendInput = Readonly<{
  from: string;
  to: string;
  subject: string;
  react: ReactElement;
  headers: Record<string, string>;
  tags: ReadonlyArray<{ name: string; value: string }>;
}>;

export type ProviderSendResult =
  | Readonly<{
      ok: true;
      providerMessageId: string;
      raw: unknown;
    }>
  | Readonly<{
      ok: false;
      retryable: boolean;
      code: string;
      message: string;
      raw: unknown;
    }>;

export interface EmailProvider {
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
}
