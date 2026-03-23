import type { McpTool } from '@apifold/types';
import type { ProfileRepository } from '../db/repositories/profile.repository';

const READ_METHODS = new Set(['get', 'head', 'options']);
const WRITE_METHODS = new Set(['get', 'head', 'options', 'post', 'put', 'patch']);

interface ToolWithMeta {
  readonly id: string;
  readonly name: string;
  readonly inputSchema: Record<string, unknown>;
}

function getToolMethod(tool: ToolWithMeta): string | null {
  const meta = (tool.inputSchema as Record<string, unknown>)?.['_meta'] as Record<string, unknown> | undefined;
  return meta?.['method'] ? String(meta['method']).toLowerCase() : null;
}

export async function autoGenerateProfiles(
  profileRepo: ProfileRepository,
  userId: string,
  serverId: string,
  tools: readonly ToolWithMeta[],
): Promise<void> {
  const readOnlyIds: string[] = [];
  const readWriteIds: string[] = [];
  const allIds: string[] = [];

  for (const tool of tools) {
    const method = getToolMethod(tool);
    allIds.push(tool.id);

    if (method && READ_METHODS.has(method)) {
      readOnlyIds.push(tool.id);
    }
    if (method && WRITE_METHODS.has(method)) {
      readWriteIds.push(tool.id);
    }
  }

  // Create default profiles
  await profileRepo.create(userId, {
    serverId,
    name: 'Read Only',
    slug: 'read-only',
    description: 'Access to GET and HEAD operations only',
    toolIds: readOnlyIds,
    isDefault: true,
  });

  await profileRepo.create(userId, {
    serverId,
    name: 'Read/Write',
    slug: 'read-write',
    description: 'Access to GET, POST, PUT, and PATCH operations (no DELETE)',
    toolIds: readWriteIds,
    isDefault: true,
  });

  await profileRepo.create(userId, {
    serverId,
    name: 'Full Access',
    slug: 'full-access',
    description: 'Access to all operations including DELETE',
    toolIds: allIds,
    isDefault: true,
  });
}
