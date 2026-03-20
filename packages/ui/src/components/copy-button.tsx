"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "../lib/utils";
import { Button, type ButtonProps } from "./button";

interface CopyButtonProps extends Omit<ButtonProps, "onClick"> {
  readonly value: string;
  readonly onCopied?: () => void;
}

function CopyButton({
  value,
  onCopied,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 2000);
  }, [value, onCopied]);

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("h-8 w-8", className)}
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      {...props}
    >
      {copied ? (
        <Check className="h-4 w-4 text-status-success" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

export { CopyButton };
