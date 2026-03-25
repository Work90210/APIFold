import { Heading, Text } from "@react-email/components";
import { Layout } from "./layout";

type Props = Readonly<{
  firstName: string | null;
  alertType: "new_login" | "password_change";
  details: string;
  timestamp: string;
}>;

const ALERT_TITLES: Record<string, string> = {
  new_login: "New login detected",
  password_change: "Password changed",
};

export function SecurityAlertEmail({
  firstName,
  alertType,
  details,
  timestamp,
}: Props) {
  const title = ALERT_TITLES[alertType] ?? "Security alert";

  return (
    <Layout preview={`Security alert: ${title}`}>
      <Heading className="text-xl font-semibold text-[#0f172a] mt-0 mb-4">
        {title}
      </Heading>
      <Text className="text-gray-600 text-sm leading-6">
        {firstName ? `Hi ${firstName}, we` : "We"} detected the following
        activity on your APIFold account:
      </Text>
      <Text className="text-gray-600 text-sm leading-6 bg-gray-50 rounded-md p-4">
        <strong>{title}</strong>
        <br />
        {details}
        <br />
        <span className="text-gray-500">
          {new Date(timestamp).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </Text>
      <Text className="text-gray-600 text-sm leading-6">
        If this wasn&apos;t you, please secure your account immediately by
        changing your password.
      </Text>
    </Layout>
  );
}
