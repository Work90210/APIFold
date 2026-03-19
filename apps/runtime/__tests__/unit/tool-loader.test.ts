import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolLoader, type ToolDefinition, type ToolFetcher } from '../../src/registry/tool-loader.js';
import { createTestLogger } from '../helpers.js';

function makeTool(name: string): ToolDefinition {
  return { id: `tool-${name}`, name, description: `Desc for ${name}`, inputSchema: { type: 'object' } };
}

describe('ToolLoader (L1)', () => {
  let fetchTools: ReturnType<typeof vi.fn<ToolFetcher>>;
  let loader: ToolLoader;

  beforeEach(() => {
    fetchTools = vi.fn<ToolFetcher>().mockResolvedValue([makeTool('list-users'), makeTool('get-user')]);
    loader = new ToolLoader({ logger: createTestLogger(), fetchTools });
  });

  it('loads tools on first access (cache miss)', async () => {
    const tools = await loader.getTools('srv-1');

    expect(tools.size).toBe(2);
    expect(tools.get('list-users')?.id).toBe('tool-list-users');
    expect(fetchTools).toHaveBeenCalledOnce();
  });

  it('returns cached tools on second access (cache hit)', async () => {
    await loader.getTools('srv-1');
    const tools = await loader.getTools('srv-1');

    expect(tools.size).toBe(2);
    expect(fetchTools).toHaveBeenCalledOnce();
  });

  it('fetches again after eviction', async () => {
    await loader.getTools('srv-1');
    loader.evict('srv-1');

    fetchTools.mockResolvedValue([makeTool('new-tool')]);
    const tools = await loader.getTools('srv-1');

    expect(tools.size).toBe(1);
    expect(tools.get('new-tool')).toBeDefined();
    expect(fetchTools).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent requests for the same server', async () => {
    const [t1, t2, t3] = await Promise.all([
      loader.getTools('srv-1'),
      loader.getTools('srv-1'),
      loader.getTools('srv-1'),
    ]);

    expect(t1).toBe(t2);
    expect(t2).toBe(t3);
    expect(fetchTools).toHaveBeenCalledOnce();
  });

  it('evictAll clears all entries', async () => {
    await loader.getTools('srv-1');
    await loader.getTools('srv-2');
    loader.evictAll();

    fetchTools.mockResolvedValue([]);
    await loader.getTools('srv-1');
    await loader.getTools('srv-2');

    expect(fetchTools).toHaveBeenCalledTimes(4); // 2 initial + 2 after evict
  });
});
