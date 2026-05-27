import { describe, it, expect, vi } from 'vitest';
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

  it('rejects unrecognised content (parseable but not a known spec) with UNSUPPORTED_FORMAT', async () => {
    // "not a spec" parses as a YAML string scalar — detector returns
    // 'unknown', and the format-converter pipeline converts that to 415.
    await expect(parseSpec('not a spec', { sizeBytes: 10 })).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
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

  it('accepts Swagger 2.0 via auto-conversion (phase 03)', async () => {
    const swagger2 = `swagger: "2.0"
info: { title: old, version: "1" }
paths:
  /x:
    get:
      summary: ok
      responses: { "200": { description: ok } }
`;
    const result = await parseSpec(swagger2, { sizeBytes: swagger2.length });
    expect(result.apiName).toBe('old');
    expect(result.groups.length).toBeGreaterThan(0);
  });

  it('rejects Swagger 1.x with UNSUPPORTED_FORMAT (obsolete since 2014, no converter)', async () => {
    const swagger1 = `swaggerVersion: "1.2"
info: { title: ancient, version: "1" }
`;
    await expect(parseSpec(swagger1, { sizeBytes: swagger1.length })).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
    });
  });

  it('rejects pathologically deep YAML with PARSE_DEPTH_EXCEEDED (> 50 levels)', async () => {
    const deep = deepYaml(55);
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

  it('preserves native YAML types (booleans, numbers) — not stringified by FAILSAFE', async () => {
    const yamlWithRequired = `openapi: "3.0.3"
info: { title: req, version: "1" }
paths:
  /x/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string } }
      - { name: limit, in: query, required: false, schema: { type: integer } }
    get:
      summary: g
      responses:
        "200": { description: ok }
`;
    const result = await parseSpec(yamlWithRequired, { sizeBytes: yamlWithRequired.length });
    const params = result.groups[0].endpoints[0].params;
    const id = params.find((p) => p.name === 'id');
    const limit = params.find((p) => p.name === 'limit');
    expect(id?.required).toBe(true);
    expect(limit?.required).toBe(false);
  });

  it('still rejects unsafe YAML tags (e.g., !!js/function) — anti-bomb invariant', async () => {
    const unsafe = `openapi: "3.0.3"
info: { title: bomb, version: "1" }
evil: !!js/function "function(){return 1}"
paths:
  /x: { get: { summary: g, responses: { "200": { description: ok } } } }
`;
    // CORE_SCHEMA throws on the non-standard tag — safeLoad returns null,
    // the detector classifies the input as 'unknown' (we don't translate
    // arbitrary-tag YAML) and the route surfaces it as UNSUPPORTED_FORMAT.
    // The contract is "rejected"; the precise code is a side-effect of the
    // detector taxonomy, not a security weakening.
    await expect(parseSpec(unsafe, { sizeBytes: unsafe.length })).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
    });
  });

  it('returns UNSUPPORTED_FORMAT on truly malformed YAML (e.g. tab-indented)', async () => {
    // js-yaml rejects mixed-tab indentation. Detector classifies as
    // 'unknown' → 415 UNSUPPORTED_FORMAT. Regression test for the path
    // formerly covered by the phase-02 'malformed YAML → INVALID_SPEC'
    // case (now rebranded since "we recognised nothing" is a more honest
    // failure than "your spec is invalid").
    const malformed = '\tfoo:\n\t\tbar: 1';
    await expect(
      parseSpec(malformed, { sizeBytes: malformed.length })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' });
  });

  it('rejects external $ref hidden inside a Swagger 2.0 doc — defence in depth', async () => {
    // The phase-02 assertNoExternalRefs ran on the user's raw YAML tree;
    // after the phase-03 reshape it would run on the post-conversion tree
    // (where swagger2openapi may rewrite refs). We add a pre-conversion
    // scan so the original SSRF guard still fires regardless of what the
    // converter does with `$ref`s.
    const swagger2WithExternalRef = `swagger: "2.0"
info: { title: ssrf, version: "1" }
paths:
  /x:
    get:
      summary: g
      responses:
        "200":
          description: ok
          schema:
            $ref: "http://169.254.169.254/latest/meta-data/"
`;
    await expect(
      parseSpec(swagger2WithExternalRef, { sizeBytes: swagger2WithExternalRef.length })
    ).rejects.toMatchObject({ code: 'INVALID_SPEC' });
  });

  it('PARSE_TIMEOUT covers the whole pipeline (conversion + validation)', async () => {
    // Hijack the converter so it hangs indefinitely. If the timeout only
    // wrapped SwaggerParser.validate (the phase-02 behaviour), this test
    // would hang and time out the entire suite. With the phase-03 fix
    // `withTimeout` envelops the conversion stage too, so we get the typed
    // PARSE_TIMEOUT back well within Vitest's per-test budget.
    const converter = await import('./format-converter');
    const spy = vi
      .spyOn(converter, 'convertToOpenAPI3')
      .mockImplementation(() => new Promise(() => {}));
    try {
      await expect(
        parseSpec('openapi: "3.0.3"', { sizeBytes: 20, timeoutMs: 30 })
      ).rejects.toMatchObject({ code: 'PARSE_TIMEOUT' });
    } finally {
      spy.mockRestore();
    }
  });

  it('accepts the Swashbuckle "scheme: Bearer" convention via sanitizer', async () => {
    // Real-world bug from .NET Swashbuckle: `Bearer` (capitalised) instead
    // of the RFC 7235 lowercase form. Without the sanitizer this would fail
    // SwaggerParser.validate with a wall of unreadable schema errors.
    const swashbuckleSpec = `openapi: "3.0.3"
info: { title: dotnet, version: "1" }
paths:
  /things:
    get:
      summary: list
      security:
        - Bearer: []
      responses: { "200": { description: ok } }
components:
  securitySchemes:
    Bearer:
      type: http
      scheme: Bearer
      bearerFormat: JWT
`;
    const result = await parseSpec(swashbuckleSpec, {
      sizeBytes: swashbuckleSpec.length,
    });
    expect(result.apiName).toBe('dotnet');
    expect(result.groups.length).toBeGreaterThan(0);
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
