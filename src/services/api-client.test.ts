import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not send JSON content type for bodyless GET requests', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { ok: true }, error: null })));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/health');

    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({
      headers: {},
    }));
  });
});
