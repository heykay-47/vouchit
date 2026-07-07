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

  it('returns 404 envelope for unknown api routes', async () => {
    const res = await request(createApp()).get('/api/does-not-exist').expect(404);

    expect(res.body.data).toBeNull();
    expect(res.body.error.message).toBe('Not found');
  });

  it('sets security headers via helmet', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('applies rate-limit headers to auth routes', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong12345' });

    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });
});
