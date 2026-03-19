import "@apifold/ui/tokens/colors.css";
import "@apifold/ui/tokens/spacing.css";
import "@apifold/ui/tokens/typography.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "APIFold",
  description: "Turn any REST API into an MCP server. No code required.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
