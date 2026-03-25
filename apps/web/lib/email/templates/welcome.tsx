import { Button, Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type WelcomeProps = Readonly<{
  firstName: string | null;
  dashboardUrl: string;
}>;

export function WelcomeEmail({ firstName, dashboardUrl }: WelcomeProps) {
  const greeting = firstName ? `Hi ${firstName}` : "Welcome";
  return (
    <Layout preview="Welcome to APIFold — your MCP gateway is ready">
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        {greeting}, welcome to APIFold!
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        Your account is ready. APIFold lets you create, manage, and route API
        requests through MCP servers with built-in monitoring and access
        controls.
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        Head to your dashboard to create your first server configuration.
      </Text>
      <Button
        href={dashboardUrl}
        className="bg-[#3b82f6] text-white text-sm font-medium px-6 py-3 rounded-md no-underline mt-2 inline-block"
      >
        Go to Dashboard
      </Button>
    </Layout>
  );
}
