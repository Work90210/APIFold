import { Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  currentSpend: number;
  budgetCap: number;
  percentage: number;
  unsubscribeUrl?: string;
}>;

export function BudgetCapWarningEmail({
  firstName,
  currentSpend,
  budgetCap,
  percentage,
  unsubscribeUrl,
}: Props) {
  const formatCents = (cents: number) =>
    `$${(cents / 100).toFixed(2)}`;

  return (
    <Layout
      preview={`Budget alert — ${percentage}% of your budget cap used`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Budget cap alert — {percentage}%
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, you've` : "You've"} spent{" "}
        <strong>{formatCents(currentSpend)}</strong> of your{" "}
        <strong>{formatCents(budgetCap)}</strong> monthly budget cap.
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        Once you reach your budget cap, additional requests will be blocked to
        prevent unexpected charges.
      </Text>
    </Layout>
  );
}
