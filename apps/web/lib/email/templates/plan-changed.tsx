import { Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  oldPlan: string;
  newPlan: string;
}>;

export function PlanChangedEmail({ firstName, oldPlan, newPlan }: Props) {
  return (
    <Layout preview={`Your plan changed from ${oldPlan} to ${newPlan}`}>
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Plan updated
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, your` : "Your"} plan has been changed
        from <strong>{oldPlan}</strong> to <strong>{newPlan}</strong>.
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        Your new plan limits are effective immediately.
      </Text>
    </Layout>
  );
}
