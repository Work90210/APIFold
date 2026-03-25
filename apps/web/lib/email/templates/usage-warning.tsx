import { Button, Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  currentUsage: number;
  limit: number;
  percentage: number;
  upgradeUrl: string;
  unsubscribeUrl?: string;
}>;

export function UsageWarningEmail({
  firstName,
  currentUsage,
  limit,
  percentage,
  upgradeUrl,
  unsubscribeUrl,
}: Props) {
  return (
    <Layout
      preview={`You've used ${percentage}% of your monthly request limit`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Usage alert — {percentage}% of limit reached
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, you've` : "You've"} used{" "}
        <strong>
          {currentUsage.toLocaleString()} of {limit.toLocaleString()}
        </strong>{" "}
        requests this month ({percentage}%).
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        Consider upgrading your plan to avoid hitting your limit.
      </Text>
      <Button
        href={upgradeUrl}
        className="bg-[#3b82f6] text-white text-sm font-medium px-6 py-3 rounded-md no-underline mt-2 inline-block"
      >
        View plans
      </Button>
    </Layout>
  );
}
