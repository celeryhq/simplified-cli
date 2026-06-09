import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimplifiedAPI } from './api';

const baseConfig = { apiKey: 'kid.secret', apiUrl: 'https://api.simplified.com' };

function mockFetchOnce(value: Partial<Response>) {
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(value as Response);
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

describe('request() 204 handling', () => {
  it('returns undefined on 204 without calling json()', async () => {
    const json = vi.fn();
    mockFetchOnce({ ok: true, status: 204, json, text: async () => '' });
    const api = new SimplifiedAPI(baseConfig);
    const result = await api.deleteProject('blogger', 'proj_1');
    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('still parses JSON on 200', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ id: 'bk_1' }), text: async () => JSON.stringify({ id: 'bk_1' }) });
    const api = new SimplifiedAPI(baseConfig);
    const result = await api.getBrandKit('bk_1');
    expect(result).toEqual({ id: 'bk_1' });
  });
});

describe('brand kit URL/query construction', () => {
  it('getBrandKit encodes expand and injects the Space header', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({}), text: async () => '{}' });
    const api = new SimplifiedAPI({ ...baseConfig, teamspaceId: '42' });
    await api.getBrandKit('bk_1', { expand: 'extra,website' });
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.simplified.com/api/v2/brandkits/bk_1?expand=extra%2Cwebsite');
    expect((init as RequestInit).headers).toMatchObject({ Space: '42' });
  });

  it('listContextDocuments forwards canonical_key and ordering as query params', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({}), text: async () => '{}' });
    const api = new SimplifiedAPI(baseConfig);
    await api.listContextDocuments('bk_1', { canonical_key: 'brand_voice', ordering: '-created' });
    const [url] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(
      'https://api.simplified.com/api/v1/brandkit/bk_1/context-documents?canonical_key=brand_voice&ordering=-created'
    );
  });
});
