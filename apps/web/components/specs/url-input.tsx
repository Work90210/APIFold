"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Button, Input } from "@apifold/ui";

interface UrlInputProps {
  readonly onSubmit: (url: string) => void;
  readonly isLoading?: boolean;
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();

  const validateUrl = (value: string): string | undefined => {
    if (!value) return undefined;
    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "Only HTTP and HTTPS URLs are supported.";
      }
      return undefined;
    } catch {
      return "Enter a valid URL (e.g. https://api.example.com/openapi.json).";
    }
  };

  const handleBlur = () => {
    if (url) {
      const validationError = validateUrl(url);
      setError(validationError);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSubmit(url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="OpenAPI Spec URL"
        placeholder="https://api.example.com/openapi.json"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={handleBlur}
        error={error}
        helpText="Provide a publicly accessible URL to your raw JSON or YAML spec."
      />
      <Button type="submit" disabled={!url || isLoading}>
        {isLoading ? (
          <>
            <Globe className="mr-2 h-4 w-4 animate-spin" />
            Fetching...
          </>
        ) : (
          <>
            <Globe className="mr-2 h-4 w-4" />
            Fetch Spec
          </>
        )}
      </Button>
    </form>
  );
}
