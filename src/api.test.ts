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
