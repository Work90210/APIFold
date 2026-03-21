"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { CopyButton } from "./copy-button";

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly code: string;
  readonly language?: string;
  readonly title?: string;
}

function CodeBlock({
  code,
  language,
  title,
  className,
  ...props
}: CodeBlockProps) {
  return (
    <div
      className={cn("relative rounded-lg border bg-surface-2", className)}
      {...props}
    >
      {title && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {title}
          </span>
          <CopyButton value={code} />
        </div>
      )}
      <div className="relative">
        {!title && (
          <CopyButton
            value={code}
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 [div:hover>&]:opacity-100 focus-visible:opacity-100"
          />
        )}
        <pre className="overflow-x-auto p-4">
          <code
            className={cn(
              "font-mono text-sm",
              language && `language-${language}`,
            )}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

export { CodeBlock };
