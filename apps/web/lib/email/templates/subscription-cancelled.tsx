import { Button, Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  planName: string;
  resubscribeUrl: string;
}>;

export function SubscriptionCancelledEmail({
  firstName,
  planName,
  resubscribeUrl,
}: Props) {
  return (
    <Layout preview={`Your ${planName} subscription has been cancelled`}>
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Subscription cancelled
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, your` : "Your"}{" "}
        <strong>{planName}</strong> subscription has been cancelled. Your account
        has been reverted to the <strong>Free</strong> plan.
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        You&apos;ll still have access to Free plan features including 2 servers
        and 1,000 requests per month.
      </Text>
      <Button
        href={resubscribeUrl}
        className="bg-[#3b82f6] text-white text-sm font-medium px-6 py-3 rounded-md no-underline mt-2 inline-block"
      >
        Resubscribe
      </Button>
    </Layout>
  );
}
