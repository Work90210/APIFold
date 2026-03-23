export interface AccessProfile {
  readonly id: string;
  readonly serverId: string;
  readonly userId: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly toolIds: readonly string[];
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateProfileInput {
  readonly serverId: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly toolIds: readonly string[];
  readonly isDefault?: boolean;
}

export interface UpdateProfileInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly toolIds?: readonly string[];
}

export interface ProfileFilters {
  readonly serverId?: string;
}
