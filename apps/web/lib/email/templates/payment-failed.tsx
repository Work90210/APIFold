import { Button, Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  invoiceAmount: string;
  billingUrl: string;
  retryDate: string | null;
}>;

export function PaymentFailedEmail({
  firstName,
  invoiceAmount,
  billingUrl,
  retryDate,
}: Props) {
  return (
    <Layout preview="Payment issue with your APIFold subscription">
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Payment failed
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, we` : "We"} were unable to process your
        payment of <strong>{invoiceAmount}</strong> for your APIFold
        subscription.
      </Text>
      {retryDate && (
        <Text className="text-gray-600 text-sm leading-6">
          We&apos;ll automatically retry on <strong>{retryDate}</strong>.
        </Text>
      )}
      <Text className="text-gray-600 text-sm leading-6">
        Please update your billing details to avoid service interruption.
      </Text>
      <Button
        href={billingUrl}
        className="bg-[#3b82f6] text-white text-sm font-medium px-6 py-3 rounded-md no-underline mt-2 inline-block"
      >
        Update billing details
      </Button>
    </Layout>
  );
}
