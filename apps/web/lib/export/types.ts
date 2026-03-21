export interface ExportTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly method: string;
  readonly path: string;
}

export interface ExportConfig {
  readonly slug: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly authMode: 'none' | 'api-key' | 'bearer';
  readonly tools: readonly ExportTool[];
}
