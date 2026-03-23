export interface Spec {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly version: string;
  readonly sourceUrl: string | null;
  readonly rawSpec: Record<string, unknown>;
  readonly toolCount: number;
  readonly currentVersionId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSpecInput {
  readonly name: string;
  readonly version: string;
  readonly sourceUrl?: string | null;
  readonly rawSpec: Record<string, unknown>;
}

export interface UpdateSpecInput {
  readonly name?: string;
  readonly version?: string;
  readonly sourceUrl?: string | null;
  readonly rawSpec?: Record<string, unknown>;
}

export interface SpecFilters {
  readonly name?: string;
  readonly version?: string;
}
