/**
 * Ambient declaration for `swagger2openapi` (no upstream types).
 * We only use `convertStr` in this codebase; expose the minimum surface.
 */
declare module 'swagger2openapi' {
  export interface ConvertOptions {
    patch?: boolean;
    warnOnly?: boolean;
    resolve?: boolean;
    fetch?: boolean;
    fatal?: boolean;
    [key: string]: unknown;
  }

  export interface ConvertResult {
    openapi: unknown;
  }

  export function convertStr(
    str: string,
    options: ConvertOptions
  ): Promise<ConvertResult>;
}
