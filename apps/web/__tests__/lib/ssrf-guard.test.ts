import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSpecFromUrl } from '../../lib/ssrf-guard.js';
import * as dns from 'node:dns';

vi.mock('node:dns', () => ({
  promises: {
    resolve4: vi.fn(),
    resolve6: vi.fn(),
  },
}));

describe('fetchSpecFromUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-HTTP protocols', async () => {
    await expect(fetchSpecFromUrl('ftp://example.com/spec.json')).rejects.toThrow('Only HTTP/HTTPS');
  });

  it('rejects file:// protocol', async () => {
    await expect(fetchSpecFromUrl('file:///etc/passwd')).rejects.toThrow('Only HTTP/HTTPS');
  });

  it('rejects private IP (127.x)', async () => {
    (dns.promises.resolve4 as ReturnType<typeof vi.fn>).mockResolvedValue(['127.0.0.1']);
    await expect(fetchSpecFromUrl('http://evil.com/spec.json')).rejects.toThrow('private IP');
  });

  it('rejects private IP (10.x)', async () => {
    (dns.promises.resolve4 as ReturnType<typeof vi.fn>).mockResolvedValue(['10.0.0.1']);
    await expect(fetchSpecFromUrl('http://evil.com/spec.json')).rejects.toThrow('private IP');
  });

  it('rejects private IP (192.168.x)', async () => {
    (dns.promises.resolve4 as ReturnType<typeof vi.fn>).mockResolvedValue(['192.168.1.1']);
    await expect(fetchSpecFromUrl('http://evil.com/spec.json')).rejects.toThrow('private IP');
  });

  it('rejects private IP (169.254.x — link-local)', async () => {
    (dns.promises.resolve4 as ReturnType<typeof vi.fn>).mockResolvedValue(['169.254.169.254']);
    await expect(fetchSpecFromUrl('http://evil.com/spec.json')).rejects.toThrow('private IP');
  });

  it('rejects unresolvable hostname', async () => {
    (dns.promises.resolve4 as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOTFOUND'));
    (dns.promises.resolve6 as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOTFOUND'));
    await expect(fetchSpecFromUrl('http://doesnotexist.invalid/spec.json')).rejects.toThrow('resolve hostname');
  });
});
