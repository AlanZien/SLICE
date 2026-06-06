import { describe, it, expect } from 'vitest';
import { extractSpecUrls, commonSpecPaths, extractInlineSpec } from './html-spec-finder';

const BASE = 'https://docs.example.com/api';

describe('extractSpecUrls', () => {
  it('extracts absolute URL from <a href> pointing to an openapi.json', () => {
    const html = '<a href="/openapi.json">Download spec</a>';
    expect(extractSpecUrls(html, BASE)).toContain('https://docs.example.com/openapi.json');
  });

  it('extracts URL from <link href> pointing to openapi.yaml', () => {
    const html = '<link rel="alternate" href="/api/openapi.yaml">';
    expect(extractSpecUrls(html, BASE)).toContain('https://docs.example.com/api/openapi.yaml');
  });

  it('ignores <a href> with no spec keyword', () => {
    const html = '<a href="/docs.json">Docs</a>';
    expect(extractSpecUrls(html, BASE)).toHaveLength(0);
  });

  it('ignores <a href> that is not json/yaml', () => {
    const html = '<a href="/openapi-spec">View spec</a>';
    expect(extractSpecUrls(html, BASE)).toHaveLength(0);
  });

  it('resolves relative paths against the page URL', () => {
    const html = '<a href="swagger.json">spec</a>';
    const result = extractSpecUrls(html, 'https://api.stripe.com/docs/');
    expect(result[0]).toBe('https://api.stripe.com/docs/swagger.json');
  });

  it('handles absolute hrefs', () => {
    const html = '<a href="https://cdn.example.com/openapi.json">spec</a>';
    expect(extractSpecUrls(html, BASE)).toContain('https://cdn.example.com/openapi.json');
  });

  it('extracts multiple candidates', () => {
    const html = `
      <a href="/v1/openapi.json">v1</a>
      <a href="/v2/swagger.yaml">v2</a>
    `;
    const result = extractSpecUrls(html, BASE);
    expect(result).toHaveLength(2);
  });

  it('matches "api-docs" keyword in href', () => {
    const html = '<a href="/api-docs.json">API</a>';
    expect(extractSpecUrls(html, BASE)).toHaveLength(1);
  });
});

describe('commonSpecPaths', () => {
  it('returns absolute URLs on the same origin', () => {
    const paths = commonSpecPaths('https://api.example.com/docs');
    expect(paths).toContain('https://api.example.com/openapi.json');
    expect(paths).toContain('https://api.example.com/openapi.yaml');
    expect(paths).toContain('https://api.example.com/swagger.json');
    expect(paths).toContain('https://api.example.com/v3/api-docs');
  });

  it('always uses the origin, ignoring path', () => {
    const paths = commonSpecPaths('https://docs.stripe.com/api/v1/charges');
    for (const p of paths) {
      expect(p.startsWith('https://docs.stripe.com/')).toBe(true);
    }
  });
});

describe('extractInlineSpec', () => {
  it('returns inline JSON from <script type="application/json"> containing openapi key', () => {
    const json = JSON.stringify({ openapi: '3.0.0', info: { title: 'Test', version: '1' }, paths: {} });
    const html = `<script type="application/json">${json}</script>`;
    expect(extractInlineSpec(html)).toBe(json);
  });

  it('returns inline content from <script type="application/yaml"> containing swagger key', () => {
    const yaml = 'swagger: "2.0"\ninfo:\n  title: Test\n  version: "1"\npaths: {}';
    const html = `<script type="application/yaml">${yaml}</script>`;
    expect(extractInlineSpec(html)).toBe(yaml);
  });

  it('returns null when no script tag with spec content exists', () => {
    const html = '<script type="application/json">{"foo":"bar"}</script>';
    expect(extractInlineSpec(html)).toBeNull();
  });

  it('returns null for regular script tags', () => {
    const html = '<script>window.__APP__ = {}</script>';
    expect(extractInlineSpec(html)).toBeNull();
  });
});
