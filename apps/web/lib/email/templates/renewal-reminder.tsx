import { Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  planName: string;
  renewalDate: string;
  amount: string;
  unsubscribeUrl?: string;
}>;

export function RenewalReminderEmail({
  firstName,
  planName,
  renewalDate,
  amount,
  unsubscribeUrl,
}: Props) {
  return (
    <Layout
      preview={`Your ${planName} plan renews on ${renewalDate}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Upcoming renewal
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, your` : "Your"}{" "}
        <strong>{planName}</strong> plan will renew on{" "}
        <strong>{renewalDate}</strong> for <strong>{amount}</strong>.
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        No action is needed. If you&apos;d like to make changes, visit your
        billing settings before the renewal date.
      </Text>
    </Layout>
  );
}
