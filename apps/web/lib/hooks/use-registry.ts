"use client";

import { useMemo, useState } from "react";
import { listAll, search, getCategories, type RegistryEntry, type Category, type AuthType } from "@apifold/registry";

export function useRegistry() {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);

  const allEntries = useMemo(() => listAll(), []);
  const categories = useMemo(() => getCategories(), []);

  const results = useMemo(
    () =>
      search({
        query: query || undefined,
        category: categoryFilter ?? undefined,
      }),
    [query, categoryFilter],
  );

  return {
    entries: results,
    allEntries,
    categories,
    query,
    setQuery,
    categoryFilter,
    setCategoryFilter,
  };
}

export type { RegistryEntry, Category, AuthType };
