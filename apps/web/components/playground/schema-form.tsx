"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@apifold/ui";
import { cn } from "@apifold/ui";

type JSONSchema = Readonly<Record<string, unknown>>;

interface SchemaFormProps {
  readonly schema: JSONSchema;
  readonly value: Record<string, unknown>;
  readonly onChange: (value: Record<string, unknown>) => void;
  readonly disabled?: boolean;
}

interface FieldProps {
  readonly name: string;
  readonly schema: JSONSchema;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly depth?: number;
}

const MAX_DEPTH = 4;

function resolveType(schema: JSONSchema): string {
  if (typeof schema.type === 'string') return schema.type;
  if (Array.isArray(schema.type)) {
    const nonNull = (schema.type as string[]).filter((t) => t !== 'null');
    return nonNull[0] ?? 'string';
  }
  if (schema.properties) return 'object';
  if (schema.items) return 'array';
  if (schema.enum) return 'string';
  return 'string';
}

function SchemaField({ name, schema, value, onChange, required, disabled, depth = 0 }: FieldProps) {
  const type = resolveType(schema);
  const description = schema.description as string | undefined;
  const label = name.replace(/_/g, ' ');

  if (depth >= MAX_DEPTH && (type === 'object' || type === 'array')) {
    return (
      <JsonFallbackField
        name={name}
        value={value}
        onChange={onChange}
        description={description}
        disabled={disabled}
      />
    );
  }

  switch (type) {
    case 'string': {
      if (Array.isArray(schema.enum)) {
        return (
          <FieldWrapper name={label} description={description} required={required}>
            <select
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Select...</option>
              {(schema.enum as string[]).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FieldWrapper>
        );
      }

      const format = schema.format as string | undefined;
      const inputType = format === 'date-time' ? 'datetime-local'
        : format === 'date' ? 'date'
        : format === 'email' ? 'email'
        : format === 'uri' ? 'url'
        : 'text';

      return (
        <FieldWrapper name={label} description={description} required={required}>
          <input
            type={inputType}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={schema.default !== undefined ? String(schema.default) : undefined}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono"
          />
        </FieldWrapper>
      );
    }

    case 'integer':
    case 'number': {
      return (
        <FieldWrapper name={label} description={description} required={required}>
          <input
            type="number"
            step={type === 'integer' ? '1' : 'any'}
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { onChange(undefined); return; }
              onChange(type === 'integer' ? parseInt(raw, 10) : parseFloat(raw));
            }}
            disabled={disabled}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono"
          />
        </FieldWrapper>
      );
    }

    case 'boolean': {
      return (
        <FieldWrapper name={label} description={description} required={required}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">{label}</span>
          </label>
        </FieldWrapper>
      );
    }

    case 'object': {
      const properties = (schema.properties ?? {}) as Record<string, JSONSchema>;
      const requiredFields = new Set((schema.required ?? []) as string[]);
      const objValue = (value ?? {}) as Record<string, unknown>;

      return (
        <FieldWrapper name={label} description={description} required={required}>
          <div className="ml-3 space-y-3 border-l border-border/50 pl-3">
            {Object.entries(properties).map(([key, propSchema]) => (
              <SchemaField
                key={key}
                name={key}
                schema={propSchema}
                value={objValue[key]}
                onChange={(v) => onChange({ ...objValue, [key]: v })}
                required={requiredFields.has(key)}
                disabled={disabled}
                depth={depth + 1}
              />
            ))}
          </div>
        </FieldWrapper>
      );
    }

    case 'array': {
      return (
        <ArrayField
          name={name}
          schema={schema}
          value={value}
          onChange={onChange}
          description={description}
          disabled={disabled}
          depth={depth}
        />
      );
    }

    default:
      return (
        <JsonFallbackField
          name={name}
          value={value}
          onChange={onChange}
          description={description}
          disabled={disabled}
        />
      );
  }
}

function ArrayField({
  name,
  schema,
  value,
  onChange,
  description,
  disabled,
  depth = 0,
}: {
  readonly name: string;
  readonly schema: JSONSchema;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly depth?: number;
}) {
  const items = (Array.isArray(value) ? value : []) as unknown[];
  const itemSchema = (schema.items ?? { type: 'string' }) as JSONSchema;
  const label = name.replace(/_/g, ' ');

  const handleAdd = () => {
    const defaultValue = resolveType(itemSchema) === 'object' ? {} : '';
    onChange([...items, defaultValue]);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, newValue: unknown) => {
    onChange(items.map((item, i) => (i === index ? newValue : item)));
  };

  return (
    <FieldWrapper name={label} description={description}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <SchemaField
                name={`${name}[${i}]`}
                schema={itemSchema}
                value={item}
                onChange={(v) => handleItemChange(i, v)}
                disabled={disabled}
                depth={depth + 1}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 mt-0.5 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => handleRemove(i)}
              disabled={disabled}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled}
          className="w-full text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add item
        </Button>
      </div>
    </FieldWrapper>
  );
}

function JsonFallbackField({
  name,
  value,
  onChange,
  description,
  disabled,
}: {
  readonly name: string;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly description?: string;
  readonly disabled?: boolean;
}) {
  const [raw, setRaw] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const label = name.replace(/_/g, ' ');

  const handleChange = useCallback((text: string) => {
    setRaw(text);
    try {
      const parsed = JSON.parse(text);
      onChange(parsed);
      setParseError(null);
    } catch {
      setParseError('Invalid JSON');
    }
  }, [onChange]);

  return (
    <FieldWrapper name={label} description={description}>
      <textarea
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        rows={4}
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2 text-xs font-mono resize-y",
          parseError ? "border-destructive" : "border-border",
        )}
      />
      {parseError && (
        <p className="text-[10px] text-destructive mt-0.5">{parseError}</p>
      )}
    </FieldWrapper>
  );
}

function FieldWrapper({
  name,
  description,
  required,
  children,
}: {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs font-medium">
        {name}
        {required && <span className="text-destructive">*</span>}
      </label>
      {/* SECURITY: description comes from user-controlled schemas. React JSX escapes
          text content by default. NEVER use dangerouslySetInnerHTML here. */}
      {description && (
        <p className="text-[10px] text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}

export function SchemaForm({ schema, value, onChange, disabled }: SchemaFormProps) {
  const properties = (schema.properties ?? {}) as Record<string, JSONSchema>;
  const requiredFields = new Set((schema.required ?? []) as string[]);

  if (Object.keys(properties).length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        This tool takes no parameters.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(properties).map(([key, propSchema]) => (
        <SchemaField
          key={key}
          name={key}
          schema={propSchema}
          value={value[key]}
          onChange={(v) => onChange({ ...value, [key]: v })}
          required={requiredFields.has(key)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
