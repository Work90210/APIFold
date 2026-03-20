import { DocsLayout } from "fumadocs-ui/layout";
import type { LinkItemType } from "fumadocs-ui/layout";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { pageTree } from "@/lib/source";
import "fumadocs-ui/style.css";
import "@/app/globals.css";

const navLinks: readonly LinkItemType[] = [
  {
    text: "Dashboard",
    url: "/dashboard",
    active: "url",
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
