import { describe, it, expect } from 'vitest';
import { parseSpec } from './parser';
import { ParseError } from '@shared/types';

const VALID_OPENAPI_3 = `openapi: "3.0.3"
info:
  title: Demo
  version: "1.0"
servers:
  - url: https://api.demo.test
paths:
  /things:
    get:
      summary: List things
      responses:
        "200": { description: ok }
`;

function deepYaml(depth: number): string {
  let inner = 'leaf: true';
  for (let i = 0; i < depth; i += 1) inner = `level:\n  ${inner.replace(/\n/g, '\n  ')}`;
  return `openapi: "3.0.0"
info: { title: deep, version: "1" }
paths:
  /x:
    get:
      summary: ok
      responses:
        "200": { description: ok }
nested:
${inner}
`;
}

describe('parseSpec', () => {
  it('accepts a valid OpenAPI 3.0 YAML', async () => {
    const result = await parseSpec(VALID_OPENAPI_3, { sizeBytes: VALID_OPENAPI_3.length });
    expect(result.apiName).toBe('Demo');
    expect(result.groups.length).toBeGreaterThan(0);
  });

  it('rejects payloads larger than 10 MB with PAYLOAD_TOO_LARGE', async () => {
    await expect(
      parseSpec(VALID_OPENAPI_3, { sizeBytes: 11 * 1024 * 1024 })
    ).rejects.toMatchObject({ name: 'ParseError', code: 'PAYLOAD_TOO_LARGE' });
  });

  it('rejects unparseable content with INVALID_SPEC', async () => {
    await expect(parseSpec('not a spec', { sizeBytes: 10 })).rejects.toMatchObject({
      code: 'INVALID_SPEC',
    });
  });

  it('rejects empty spec (no paths) with EMPTY_SPEC', async () => {
    const empty = `openapi: "3.0.0"
info: { title: empty, version: "1" }
paths: {}
`;
    await expect(parseSpec(empty, { sizeBytes: empty.length })).rejects.toMatchObject({
      code: 'EMPTY_SPEC',
    });
  });

  it('rejects Swagger 2.0 with UNSUPPORTED_VERSION (phase 02 only; phase 03 will convert)', async () => {
    const swagger2 = `swagger: "2.0"
info: { title: old, version: "1" }
paths:
  /x:
    get:
      responses: { 200: { description: ok } }
`;
    await expect(parseSpec(swagger2, { sizeBytes: swagger2.length })).rejects.toMatchObject({
      code: 'UNSUPPORTED_VERSION',
    });
  });

  it('rejects Swagger 1.x with UNSUPPORTED_VERSION', async () => {
    const swagger1 = `swaggerVersion: "1.2"
info: { title: ancient, version: "1" }
`;
    await expect(parseSpec(swagger1, { sizeBytes: swagger1.length })).rejects.toMatchObject({
      code: 'UNSUPPORTED_VERSION',
    });
  });

  it('rejects pathologically deep YAML with PARSE_DEPTH_EXCEEDED', async () => {
    const deep = deepYaml(25);
    await expect(parseSpec(deep, { sizeBytes: deep.length })).rejects.toMatchObject({
      code: 'PARSE_DEPTH_EXCEEDED',
    });
  });

  it('rejects external $ref (HTTP/file) without dereferencing them — anti-SSRF', async () => {
    const withHttpRef = `openapi: "3.0.3"
info: { title: ssrf, version: "1" }
paths:
  /x:
    get:
      summary: ok
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "http://169.254.169.254/latest/meta-data/"
`;
    await expect(
      parseSpec(withHttpRef, { sizeBytes: withHttpRef.length })
    ).rejects.toMatchObject({ code: 'INVALID_SPEC' });
  });

  it('rejects file:// $ref without reading the filesystem — anti-SSRF', async () => {
    const withFileRef = `openapi: "3.0.3"
info: { title: ssrf-file, version: "1" }
paths:
  /x:
    get:
      summary: ok
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                $ref: "file:///etc/passwd"
`;
    await expect(
      parseSpec(withFileRef, { sizeBytes: withFileRef.length })
    ).rejects.toMatchObject({ code: 'INVALID_SPEC' });
  });

  it('returns a ParseError instance (not a plain object)', async () => {
    try {
      await parseSpec('garbage', { sizeBytes: 7 });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
    }
  });
});
