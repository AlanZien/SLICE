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
  /** Marks the endpoint as deprecated per OpenAPI `deprecated: true` — phase 04 task 12.c. */
  deprecated?: boolean;
  /** Estimated tokens for selection counter (phase 05 will calibrate). */
  tokens?: number;
}

export interface EndpointGroup {
  /** OpenAPI tag, or "Autres" fallback. */
  tag: string;
  endpoints: Endpoint[];
}

export type UpstreamAuthType = 'none' | 'apiKey' | 'bearer';

export interface UpstreamAuth {
  type: UpstreamAuthType;
  /** Only meaningful for `apiKey`. */
  headerName?: string;
}

export interface DefaultConfig {
  /** Slugified MCP server name (phase 06 finalises). */
  mcpName: string;
  /** Base URL detected from `servers[0].url`. */
  baseUrl: string;
  /** Auth type detected from `securitySchemes`. */
  upstreamAuth: UpstreamAuth;
  /** Pre-generated MCP_SERVER_TOKEN candidate (32 hex chars). */
  mcpServerToken: string;
}

/** Where the generated MCP will live — drives the transports we emit. */
export type DeploymentMode = 'local' | 'remote' | 'both';

/** Final user-confirmed config, sent to `/api/generate` in phase 07. */
export interface SliceConfig {
  /** Validated MCP server name: lowercase ASCII + dashes, 3–40 chars. */
  mcpName: string;
  /** Base URL the generated MCP will call. */
  baseUrl: string;
  /** Auth scheme the generated MCP will forward to the upstream API. */
  upstreamAuth: UpstreamAuth;
  /** Deployment target (stdio / HTTP / both). */
  mode: DeploymentMode;
  /** Bearer token for the agent → MCP hop (only required when mode != local). */
  mcpServerToken?: string;
  /** If true, the generator embeds parameter descriptions in the tool schema. */
  includeParamDescriptions: boolean;
  /** If true, the generated client retries failed 5xx calls with backoff. */
  retryOnServerError: boolean;
}

export interface ParsedSpec {
  apiName: string;
  apiVersion: string;
  baseUrl: string;
  /** Top-level auth signal — full detail lives in `defaultConfig.upstreamAuth`. */
  authType: UpstreamAuthType;
  authHeader?: string;
  groups: EndpointGroup[];
  /**
   * Number of endpoints dropped during normalisation because they had no
   * usable label source (no operationId, no summary, no description) — phase
   * 04 task 12.b. Surfaced in the UI so users know the spec is missing
   * descriptions, not that SLICE silently lost endpoints.
   */
  excludedCount?: number;
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

/**
 * Payload posted by the client to `/api/generate` (phase 08). Held in shared
 * types because the same shape feeds the front-end submission, the back-end
 * Zod guard, and the unit tests for `mcp-generator` (phase 07).
 */
export interface GenerateRequest {
  /** Result of phase 02 / 03 parsing — drives endpoint/tool emission. */
  parsedSpec: ParsedSpec;
  /** Subset of endpoint ids the user picked on screen 2. */
  selectedIds: string[];
  /** Final user-confirmed configuration. */
  config: SliceConfig;
}

/** Single file emitted by the generator. `path` is the in-ZIP relative path. */
export interface GeneratedFile {
  path: string;
  content: string;
}

export class ParseError extends Error {
  constructor(public readonly code: ParseErrorCode, message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Phase 08 — error contract returned by `POST /api/generate`. The wire
 * payload is `{ code, message }`; HTTP status is implied by the code:
 *
 * - 400 `INVALID_SPEC` — Zod / parser refused the body
 * - 400 `NO_ENDPOINT_SELECTED` — none of `selectedIds` survived re-parsing
 * - 413 `PAYLOAD_TOO_LARGE` — Express body limit (15 Mo) exceeded
 * - 500 `GENERATION_FAILED` — unexpected template / archiver failure
 * - 504 `TIMEOUT` — generation took > 30s
 */
export type ApiErrorCode =
  | 'INVALID_SPEC'
  | 'NO_ENDPOINT_SELECTED'
  | 'PAYLOAD_TOO_LARGE'
  | 'GENERATION_FAILED'
  | 'TIMEOUT';

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
