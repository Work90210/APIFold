"use client";

import { useState, useCallback, useMemo } from "react";
import { cn, Button, Input } from "@apifold/ui";

interface JsonSchema {
  readonly type?: string;
  readonly properties?: Record<string, JsonSchema>;
  readonly required?: readonly string[];
  readonly enum?: readonly unknown[];
  readonly default?: unknown;
  readonly description?: string;
  readonly items?: JsonSchema;
}

interface SchemaFormProps {
  readonly schema: JsonSchema;
  readonly onSubmit: (values: Record<string, unknown>) => void;
  readonly isLoading?: boolean;
}

export function SchemaForm({ schema, onSubmit, isLoading }: SchemaFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildDefaults(schema),
  );
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState("");

  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawMode) {
      try {
        const parsed: unknown = JSON.parse(rawJson);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return;
        }
        onSubmit(parsed as Record<string, unknown>);
        return;
      } catch {
        // Invalid JSON
      }
    } else {
      onSubmit(values);
    }
  };

  const properties = schema.properties ?? {};
  const required = useMemo(() => new Set(schema.required ?? []), [schema.required]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form / JSON pill toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium font-heading tracking-tight">
          Input
        </span>
        <div className="flex rounded-xl border bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => {
              if (rawMode) {
                setRawMode(false);
              }
            }}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-all duration-300 ease-out-expo",
              !rawMode
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Form
          </button>
          <button
            type="button"
            onClick={() => {
              if (!rawMode) {
                setRawJson(JSON.stringify(values, null, 2));
                setRawMode(true);
              }
            }}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-all duration-300 ease-out-expo",
              rawMode
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            JSON
          </button>
        </div>
      </div>

      {rawMode ? (
        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          className="h-48 w-full rounded-xl border border-input bg-background p-3 font-mono text-sm transition-all duration-300 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder='{"key": "value"}'
        />
      ) : (
        Object.entries(properties).map(([key, propSchema]) => (
          <SchemaField
            key={key}
            name={key}
            schema={propSchema}
            value={values[key]}
            required={required.has(key)}
            onChange={(val) => handleFieldChange(key, val)}
          />
        ))
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg"
      >
        {isLoading ? "Executing..." : "Execute Tool"}
      </Button>
    </form>
  );
}

function SchemaField({
  name,
  schema,
  value,
  required,
  onChange,
}: {
  readonly name: string;
  readonly schema: JsonSchema;
  readonly value: unknown;
  readonly required: boolean;
  readonly onChange: (value: unknown) => void;
}) {
  const label = `${name}${required ? " *" : ""}`;

  if (schema.enum) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <select
          value={String(value ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              onChange(val);
              return;
            }
            const asNumber = Number(val);
            onChange(schema.enum?.some((v) => typeof v === "number") && !Number.isNaN(asNumber) ? asNumber : val);
          }}
          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm transition-all duration-300 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Select...</option>
          {schema.enum.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
        {schema.description && (
          <p className="text-xs text-muted-foreground leading-normal">
            {schema.description}
          </p>
        )}
      </div>
    );
  }

  if (schema.type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={name}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-brand-500"
        />
        <label htmlFor={name} className="text-sm font-medium">
          {label}
        </label>
        {schema.description && (
          <span className="text-xs text-muted-foreground leading-normal">
            — {schema.description}
          </span>
        )}
      </div>
    );
  }

  if (schema.type === "number" || schema.type === "integer") {
    return (
      <Input
        label={label}
        type="number"
        value={value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        helpText={schema.description}
        className="tabular-nums"
      />
    );
  }

  return (
    <Input
      label={label}
      value={value != null ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      helpText={schema.description}
    />
  );
}

function buildDefaults(schema: JsonSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  const properties = schema.properties ?? {};
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    }
  }
  return defaults;
}
