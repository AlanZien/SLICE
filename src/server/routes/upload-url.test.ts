import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// Mock the url-fetcher so tests don't hit the network
const mockFetchSpecFromUrl = vi.fn<(url: string) => Promise<string>>();
vi.mock('../services/url-fetcher', async (importOriginal) => {
  const real = await importOriginal<typeof import('../services/url-fetcher')>();
  return { ...real, fetchSpecFromUrl: (url: string) => mockFetchSpecFromUrl(url) };
});

const VALID_YAML = `openapi: "3.0.3"
info:
  title: Demo
  version: "1.0"
servers:
  - url: https://api.demo.test
paths:
  /things:
    get:
      tags: [Things]
      summary: list things
      responses:
        "200": { description: ok }
`;

afterEach(() => {
  mockFetchSpecFromUrl.mockReset();
});

describe('POST /api/upload-url', () => {
  it('returns 200 + ParsedSpec when URL serves a valid spec', async () => {
    mockFetchSpecFromUrl.mockResolvedValueOnce(VALID_YAML);
    const app = createApp({ nodeEnv: 'test' });
    const res = await request(app)
      .post('/api/upload-url')
      .send({ url: 'https://api.example.com/spec.yaml' });
    expect(res.status).toBe(200);
    expect(res.body.parsed.apiName).toBe('Demo');
    expect(typeof res.body.raw).toBe('string');
  });

  it('returns 400 when url is missing', async () => {
    const app = createApp({ nodeEnv: 'test' });
    const res = await request(app).post('/api/upload-url').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('URL_INVALID');
  });

  it('returns 400 URL_INVALID for non-https URL', async () => {
    const { UrlFetchError } = await import('../services/url-fetcher');
    mockFetchSpecFromUrl.mockRejectedValueOnce(new UrlFetchError('URL_INVALID', 'Only https://'));
    const app = createApp({ nodeEnv: 'test' });
    const res = await request(app)
      .post('/api/upload-url')
      .send({ url: 'http://api.example.com/spec.yaml' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('URL_INVALID');
  });

  it('returns 400 URL_PRIVATE_IP_BLOCKED for private IP', async () => {
    const { UrlFetchError } = await import('../services/url-fetcher');
    mockFetchSpecFromUrl.mockRejectedValueOnce(new UrlFetchError('URL_PRIVATE_IP_BLOCKED', 'Blocked'));
    const app = createApp({ nodeEnv: 'test' });
    const res = await request(app)
      .post('/api/upload-url')
      .send({ url: 'https://192.168.1.1/spec.yaml' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('URL_PRIVATE_IP_BLOCKED');
  });

  it('returns 504 URL_TIMEOUT on timeout', async () => {
    const { UrlFetchError } = await import('../services/url-fetcher');
    mockFetchSpecFromUrl.mockRejectedValueOnce(new UrlFetchError('URL_TIMEOUT', 'Timed out'));
    const app = createApp({ nodeEnv: 'test' });
    const res = await request(app)
      .post('/api/upload-url')
      .send({ url: 'https://slow.example.com/spec.yaml' });
    expect(res.status).toBe(504);
    expect(res.body.code).toBe('URL_TIMEOUT');
  });

  it('returns 413 URL_TOO_LARGE on oversized response', async () => {
    const { UrlFetchError } = await import('../services/url-fetcher');
    mockFetchSpecFromUrl.mockRejectedValueOnce(new UrlFetchError('URL_TOO_LARGE', 'Too large'));
    const app = createApp({ nodeEnv: 'test' });
    const res = await request(app)
      .post('/api/upload-url')
      .send({ url: 'https://big.example.com/spec.yaml' });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('URL_TOO_LARGE');
  });
});
