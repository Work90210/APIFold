export type ReleaseEnvironment = 'production' | 'preview' | 'staging';

export interface SpecRelease {
  readonly id: string;
  readonly serverId: string;
  readonly environment: ReleaseEnvironment;
  readonly versionId: string;
  readonly endpointUrl: string | null;
  readonly promotedAt: Date;
  readonly promotedBy: string;
}

export interface CreateReleaseInput {
  readonly serverId: string;
  readonly environment?: ReleaseEnvironment;
  readonly versionId: string;
  readonly endpointUrl?: string | null;
}
