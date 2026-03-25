import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  const host = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://eu.i.posthog.com';

  if (!key) return null;

  if (!client) {
    client = new PostHog(key, {
      host,
      flushAt: 10,
      flushInterval: 5000,
    });
  }

  return client;
}

export async function shutdownPostHog(): Promise<void> {
  if (client) {
    await client.shutdown();
    client = null;
  }
}
