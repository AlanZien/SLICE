import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

describe('Express app', () => {
  it('GET /api/health responds 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, status: 'ok' });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /api/health echoes the current NODE_ENV', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(res.body.env).toBeDefined();
    expect(typeof res.body.env).toBe('string');
  });
});
