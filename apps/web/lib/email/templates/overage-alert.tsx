import { Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  overageAmount: string;
  billingMonth: string;
  unsubscribeUrl?: string;
}>;

export function OverageAlertEmail({
  firstName,
  overageAmount,
  billingMonth,
  unsubscribeUrl,
}: Props) {
  return (
    <Layout
      preview={`Overage charges of ${overageAmount} for ${billingMonth}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Overage charges
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, you` : "You"} have incurred overage
        charges of <strong>{overageAmount}</strong> for {billingMonth}.
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        These charges are for requests beyond your plan&apos;s monthly limit.
        Consider upgrading to a higher plan for a better rate.
      </Text>
    </Layout>
  );
}
