import { Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  email: string;
  deletedAt: string;
}>;

export function AccountDeletedEmail({ email, deletedAt }: Props) {
  return (
    <Layout preview="Your APIFold account has been deleted">
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        Account deleted
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        Your APIFold account ({email}) has been permanently deleted on{" "}
        {new Date(deletedAt).toLocaleDateString("en-US", {
          dateStyle: "medium",
        })}
        .
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        All your server configurations, API keys, and usage data have been
        removed. This action cannot be undone.
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        If you&apos;d like to use APIFold again in the future, you can create a
        new account at any time.
      </Text>
    </Layout>
  );
}
