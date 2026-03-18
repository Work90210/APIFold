import "@model-translator/ui/tokens/colors.css";
import "@model-translator/ui/tokens/spacing.css";
import "@model-translator/ui/tokens/typography.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Model Translator",
  description: "Translate between AI model specification formats",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
