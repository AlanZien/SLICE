import { describe, it, expect } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('converts a standard title to kebab-case', () => {
    expect(slugify('Shopify Admin API')).toBe('shopify-admin-api');
  });

  it('strips accents and unicode marks', () => {
    expect(slugify('Récupérer Données')).toBe('recuperer-donnees');
  });

  it('collapses repeated whitespace and punctuation into a single dash', () => {
    expect(slugify('Foo   Bar -- Baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  -hello-  ')).toBe('hello');
  });

  it('produces lowercase only', () => {
    expect(slugify('GITHUB API')).toBe('github-api');
  });

  it('keeps digits', () => {
    expect(slugify('OpenAPI v3.1')).toBe('openapi-v3-1');
  });

  it('appends "-mcp" when the result is shorter than 3 chars', () => {
    expect(slugify('AI')).toBe('ai-mcp');
    expect(slugify('a')).toBe('a-mcp');
  });

  it('falls back to "mcp-server-<hash>" when input has no alphanumeric content', () => {
    const result = slugify('!!!');
    expect(result).toMatch(/^mcp-server-[a-f0-9]{4}$/);
  });

  it('falls back to "mcp-server-<hash>" when input is empty or whitespace', () => {
    expect(slugify('')).toMatch(/^mcp-server-[a-f0-9]{4}$/);
    expect(slugify('   ')).toMatch(/^mcp-server-[a-f0-9]{4}$/);
  });

  it('caps the result at 40 characters', () => {
    const long = 'a'.repeat(80);
    expect(slugify(long).length).toBeLessThanOrEqual(40);
  });

  it('always produces a string matching ^[a-z0-9-]{3,40}$', () => {
    const inputs = ['Shopify', 'AI', '!!!', 'Récupérer', '', 'a'.repeat(100), 'mixed CASE 99'];
    for (const input of inputs) {
      expect(slugify(input)).toMatch(/^[a-z0-9-]{3,40}$/);
    }
  });
});
