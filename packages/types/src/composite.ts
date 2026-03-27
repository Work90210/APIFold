import type { TransportType } from './server.js';

export interface CompositeServer {
  readonly id: string;
  readonly userId: string;
  readonly slug: string;
  readonly endpointId: string;
  readonly name: string;
  readonly description: string | null;
  readonly transport: TransportType;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CompositeMember {
  readonly id: string;
  readonly compositeId: string;
  readonly serverId: string;
  readonly namespace: string;
  readonly displayOrder: number;
  readonly createdAt: Date;
  /** Joined from mcp_servers for display purposes */
  readonly serverName?: string;
  readonly serverSlug?: string;
}

export interface CompositeServerWithMembers extends CompositeServer {
  readonly members: readonly CompositeMember[];
}

export interface CreateCompositeInput {
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly transport?: TransportType;
  readonly members: readonly CreateCompositeMemberInput[];
}

export interface CreateCompositeMemberInput {
  readonly serverId: string;
  readonly namespace: string;
  readonly displayOrder?: number;
}

export interface UpdateCompositeInput {
  readonly name?: string;
  readonly description?: string;
  readonly transport?: TransportType;
  readonly isActive?: boolean;
  readonly members?: readonly CreateCompositeMemberInput[];
}
