import { Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  planName: string;
  amount: string;
}>;

export function SubscriptionConfirmedEmail({
  firstName,
  planName,
  amount,
}: Props) {
  return (
    <Layout preview={`Your ${planName} subscription is active`}>
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Subscription confirmed
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, your` : "Your"}{" "}
        <strong>{planName}</strong> plan is now active at{" "}
        <strong>{amount}/month</strong>.
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        You now have access to all {planName} features including increased
        request limits and extended log retention.
      </Text>
    </Layout>
  );
}
