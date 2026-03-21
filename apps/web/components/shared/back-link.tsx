import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
