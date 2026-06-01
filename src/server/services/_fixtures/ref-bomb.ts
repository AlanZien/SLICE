/**
 * A non-cyclic `$ref` fan-out bomb: `L0` has K props each `$ref`-ing `L1`, …,
 * `Ld` is a leaf. The raw file is tiny (`O(d·K)`) but the DEREFERENCED schema is
 * `O(K^d)` — swagger-parser materialises every occurrence (no cycle → no cycle
 * detection), exploding memory. Used to exercise the parse-isolation guard
 * without a network fetch or a large file (cf. SPIKE-LOG 2026-06-01, D004).
 */
export function refBomb(K: number, d: number): string {
  const schemas: Record<string, unknown> = {};
  for (let i = 0; i < d; i++) {
    const properties: Record<string, unknown> = {};
    for (let k = 0; k < K; k++) properties[`p${k}`] = { $ref: `#/components/schemas/L${i + 1}` };
    schemas[`L${i}`] = { type: 'object', properties };
  }
  schemas[`L${d}`] = { type: 'object', properties: { leaf: { type: 'string' } } };
  return JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'bomb', version: '1' },
    paths: {
      '/x': {
        post: {
          summary: 'x',
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/L0' } } },
          },
          responses: { '200': { description: 'ok' } },
        },
      },
    },
    components: { schemas },
  });
}
