import { DocsLayout } from "fumadocs-ui/layout";
import type { LinkItemType } from "fumadocs-ui/layout";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { pageTree } from "@/lib/source";

// IMPORTANT: fumadocs-ui/style.css FIRST (base styles + its grayscale tokens)
// then our tokens OVERRIDE them with the brand palette
import "fumadocs-ui/style.css";
import "@apifold/ui/tokens/colors.css";
import "@apifold/ui/tokens/typography.css";
import "@apifold/ui/tokens/spacing.css";
import "@/app/globals.css";

const navLinks: readonly LinkItemType[] = [
  {
    text: "Dashboard",
    url: "/dashboard",
    active: "url",
  },
  {
    text: "GitHub",
    url: "https://github.com/Work90210/APIFold",
    external: true,
  },
];

export default function RootDocsLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <RootProvider>
      <DocsLayout
        tree={pageTree}
        nav={{
          title: "APIFold",
          url: "/",
        }}
        links={[...navLinks]}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
