import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

type LayoutProps = Readonly<{
  preview: string;
  children: ReactNode;
  unsubscribeUrl?: string;
}>;

export function Layout({ preview, children, unsubscribeUrl }: LayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[560px] py-8 px-4">
            <Section className="mb-8">
              <Heading className="text-2xl font-bold text-[#0f172a] m-0">
                APIFold
              </Heading>
            </Section>

            <Section className="bg-white rounded-lg border border-gray-200 p-8">
              {children}
            </Section>

            <Section className="mt-8 text-center">
              <Hr className="border-gray-200 mb-4" />
              <Text className="text-xs text-gray-500 m-0">
                &copy; {new Date().getFullYear()} APIFold. All rights reserved.
              </Text>
              {unsubscribeUrl && (
                <Text className="text-xs text-gray-500 m-0 mt-1">
                  <Link
                    href={unsubscribeUrl}
                    className="text-gray-500 underline"
                  >
                    Unsubscribe
                  </Link>{" "}
                  from these notifications
                </Text>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
