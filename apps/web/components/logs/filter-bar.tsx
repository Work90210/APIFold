"use client";

import { Input } from "@apifold/ui";

interface LogFilters {
  readonly method: string;
  readonly statusCode: string;
  readonly from: string;
  readonly to: string;
}

interface FilterBarProps {
  readonly filters: LogFilters;
  readonly onChange: (filters: LogFilters) => void;
}

const HTTP_METHODS = ["", "GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Method
        </label>
        <select
          value={filters.method}
          onChange={(e) =>
            onChange({ ...filters, method: e.target.value })
          }
          className="flex h-9 rounded-xl border border-input bg-background px-3 text-sm transition-all duration-300 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m || "All"}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Status
        </label>
        <select
          value={filters.statusCode}
          onChange={(e) =>
            onChange({ ...filters, statusCode: e.target.value })
          }
          className="flex h-9 rounded-xl border border-input bg-background px-3 text-sm transition-all duration-300 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">All</option>
          <option value="2xx">2xx Success</option>
          <option value="4xx">4xx Client Error</option>
          <option value="5xx">5xx Server Error</option>
        </select>
      </div>
      <Input
        type="date"
        label="From"
        value={filters.from}
        onChange={(e) =>
          onChange({ ...filters, from: e.target.value })
        }
        className="h-9"
      />
      <Input
        type="date"
        label="To"
        value={filters.to}
        onChange={(e) =>
          onChange({ ...filters, to: e.target.value })
        }
        className="h-9"
      />
    </div>
  );
}
