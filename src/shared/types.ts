/**
 * Shared types between client and server (SLICE phase 02).
 *
 * `defaultConfig` is reserved for phase 06 (config screen auto-detection)
 * and stays optional in this phase. See `.workflow/phases/02-upload-parsing/PLAN.md`.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface EndpointParam {
  /** Param name (path, query, header, or cookie). */
  name: string;
  /**
   * Param location. Phase 02 only flattens `parameters`; `requestBody` fields
   * are added in a later phase (cf. PLAN 04/06). Until then the `'body'`
   * variant is intentionally absent from this union so callers can't lean on
   * data we don't yet produce.
   */
  in: 'path' | 'query' | 'header' | 'cookie';
  /** OpenAPI type hint when available. */
  type?: string;
  /** True if the spec marks the param as required. */
  required: boolean;
  /** Param description if present in the spec. */
  description?: string;
}

export interface Endpoint {
  /** Stable id derived from method + path (used as React key + selection ref). */
  id: string;
  method: HttpMethod;
  /** Raw OpenAPI path (e.g. `/products/{id}`). */
  path: string;
  /** Human-friendly label per R1.2.2 priority (summary > description > generated). */
  label: string;
  /** Full description (operation description or first paragraph of summary). */
  description?: string;
  /** Flattened parameter list. Phase 02 covers path + query + header + cookie. */
  params: EndpointParam[];
  /** Estimated tokens for selection counter (phase 05 will calibrate). */
  tokens?: number;
}

export interface EndpointGroup {
  /** OpenAPI tag, or "Autres" fallback. */
  tag: string;
  endpoints: Endpoint[];
}

export type UpstreamAuthType = 'none' | 'apiKey' | 'bearer';

export interface DefaultConfig {
  /** Slugified MCP server name (phase 06 finalises). */
  mcpName: string;
  /** Base URL detected from `servers[0].url`. */
  baseUrl: string;
  /** Auth type detected from `securitySchemes`. */
  upstreamAuth: { type: UpstreamAuthType; headerName?: string };
}

export interface ParsedSpec {
  apiName: string;
  apiVersion: string;
  baseUrl: string;
  /** Top-level auth signal — full detail lives in `defaultConfig.upstreamAuth`. */
  authType: UpstreamAuthType;
  authHeader?: string;
  groups: EndpointGroup[];
  /** Optional default config block — populated in phase 06. */
  defaultConfig?: DefaultConfig;
}

/**
 * Error codes returned by the parsing pipeline. Mapped to HTTP status by
 * the upload route handler.
 */
export type ParseErrorCode =
  | 'PAYLOAD_TOO_LARGE'           // > 10 MB (R1.1.2)
  | 'UNSUPPORTED_FORMAT'          // extension not JSON/YAML, or detector returned 'unknown'
  | 'INVALID_SPEC'                // malformed JSON/YAML or invalid OpenAPI structure
  | 'EMPTY_SPEC'                  // no `paths`, no endpoints (R1.1.7)
  | 'UNSUPPORTED_VERSION'         // OpenAPI 3.2+ only (Swagger 1.x routes via 'unknown' → UNSUPPORTED_FORMAT, Swagger 2.0 is auto-converted)
  | 'UNSUPPORTED_AUTH'            // spec requires oauth2/openIdConnect/http-basic/http-digest (MVP supports none/apiKey/bearer — phase 04 task 12.a)
  | 'SWAGGER2_CONVERSION_FAILED'  // swagger2openapi could not convert the doc (phase 03)
  | 'POSTMAN_CONVERSION_FAILED'   // postman-to-openapi could not convert the collection (phase 03)
  | 'PARSE_TIMEOUT'               // > 5 s (R1.1.5)
  | 'PARSE_DEPTH_EXCEEDED';       // > 200k nodes (R1.1.6)

export class ParseError extends Error {
  constructor(public readonly code: ParseErrorCode, message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
