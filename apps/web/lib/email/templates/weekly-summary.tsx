import { Heading, Hr, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  periodLabel: string;
  totalRequests: number;
  topServers: ReadonlyArray<{ name: string; requests: number }>;
  errorRate: number;
  unsubscribeUrl?: string;
}>;

export function WeeklySummaryEmail({
  firstName,
  periodLabel,
  totalRequests,
  topServers,
  errorRate,
  unsubscribeUrl,
}: Props) {
  return (
    <Layout
      preview={`Your weekly summary: ${totalRequests.toLocaleString()} requests`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Weekly summary
      </Heading>
      <Text className="text-xs text-gray-500 mt-0 mb-4">{periodLabel}</Text>

      <Text className="text-gray-600 text-sm leading-6 mt-0 mb-1">
        {firstName ? `Hi ${firstName}, here's` : "Here's"} your weekly overview:
      </Text>

      <Text className="text-gray-600 text-sm leading-6 mt-0 mb-0">
        <strong>Total requests:</strong> {totalRequests.toLocaleString()}
      </Text>
      <Text className="text-gray-600 text-sm leading-6 mt-0 mb-0">
        <strong>Error rate:</strong> {errorRate.toFixed(1)}%
      </Text>

      {topServers.length > 0 && (
        <>
          <Hr className="border-gray-200 my-4" />
          <Text className="text-gray-600 text-sm font-semibold mt-0 mb-2">
            Top servers
          </Text>
          {topServers.map((server) => (
            <Text
              key={server.name}
              className="text-gray-600 text-sm leading-6 mt-0 mb-0"
            >
              {server.name} — {server.requests.toLocaleString()} requests
            </Text>
          ))}
        </>
      )}
    </Layout>
  );
}
