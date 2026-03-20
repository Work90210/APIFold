"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api-client";

type ExportFormat = "json" | "yaml";

interface ExportResult {
  readonly content: string;
  readonly format: ExportFormat;
  readonly filename: string;
}

export function useExport(serverId: string, format: ExportFormat) {
  return useQuery({
    queryKey: ["export", serverId, format],
    queryFn: () =>
      api.get<ExportResult>(`/servers/${serverId}/export`, { format }),
    enabled: false,
  });
}
