import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

import { Logo } from "@/components/brand/logo";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
        <Logo className="h-8 w-8 text-foreground" />
        APIFold
      </div>
      <SignUp
        appearance={{
          baseTheme: dark,
          elements: {
            rootBox: "mx-auto",
            card: "bg-background border border-border shadow-none",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "border-border text-foreground hover:bg-muted",
            formFieldLabel: "text-muted-foreground",
            formFieldInput:
              "bg-background border-border text-foreground focus:ring-ring",
            footerActionLink: "text-primary hover:text-primary/80",
            identityPreviewEditButton: "text-primary",
          },
        }}
        fallbackRedirectUrl="/dashboard"
        signInUrl="/sign-in"
      />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Turn any REST API into an MCP server.
        <br />
        No code required.
      </p>
    </div>
  );
}
