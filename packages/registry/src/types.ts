export type Category =
  | 'payments'
  | 'developer-tools'
  | 'communication'
  | 'crm'
  | 'ai'
  | 'productivity'
  | 'demo';

export type AuthType = 'bearer' | 'api_key' | 'oauth' | 'basic' | 'none';

export interface RegistryMeta {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: Category;
  readonly authType: AuthType;
  readonly docsUrl: string;
  readonly logoUrl?: string;
  readonly tags: readonly string[];
}

export interface RegistryEntry extends RegistryMeta {
  readonly specPath: string;
  readonly operationCount: number;
}

export interface RegistrySearchOptions {
  readonly query?: string;
  readonly category?: Category;
  readonly authType?: AuthType;
}
