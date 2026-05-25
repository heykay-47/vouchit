import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('createApp', () => {
  afterEach(() => {
    delete process.env.CORS_ORIGIN;
  });

  it('allows configured local development origin', async () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';

    const res = await request(createApp())
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
