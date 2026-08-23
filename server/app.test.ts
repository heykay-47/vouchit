import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

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

  it('mounts business mutations behind the write limiter', async () => {
    const res = await request(createApp()).post('/api/business/campaigns').send({});

    expect(res.status).toBe(401);
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('leaves offer reads outside the write limiter and limits offer claims', async () => {
    const read = await request(createApp()).get('/api/offers?limit=0');
    const write = await request(createApp()).post('/api/offers/campaign/not-an-id/claim');

    expect(read.headers['ratelimit-remaining']).toBeUndefined();
    expect(write.headers['ratelimit-remaining']).toBeDefined();
  });

  it('maps oversized JSON bodies to a safe 413 envelope', async () => {
    const res = await request(createApp())
      .post('/api/business/campaigns')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ payload: 'x'.repeat(1024 * 1024) }));

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ data: null, error: { message: 'Request entity too large' } });
  });
});
