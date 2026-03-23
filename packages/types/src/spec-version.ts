export interface SpecVersion {
  readonly id: string;
  readonly specId: string;
  readonly versionNumber: number;
  readonly versionLabel: string | null;
  readonly rawSpec: Record<string, unknown>;
  readonly toolSnapshot: Record<string, unknown>[];
  readonly toolCount: number;
  readonly diffSummary: Record<string, unknown> | null;
  readonly isBreaking: boolean | null;
  readonly sourceUrl: string | null;
  readonly createdAt: Date;
}

export interface CreateSpecVersionInput {
  readonly specId: string;
  readonly versionLabel?: string | null;
  readonly rawSpec: Record<string, unknown>;
  readonly toolSnapshot: Record<string, unknown>[];
  readonly sourceUrl?: string | null;
}
