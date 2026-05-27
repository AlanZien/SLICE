/**
 * Token estimator — frozen formula calibrated in phase 05.
 *
 * Coefficients were tuned against tiktoken `cl100k_base` on 4 fixtures:
 *   custom-10, shopify-50, github-100, stripe-200.
 *
 * Worst observed deviation: 2.6% (well under the SPEC R1.2.8 ±15% bound).
 * Methodology + raw numbers: `docs/token-estimator.md`.
 *
 * The estimator runs client-side (used by the selection sidebar to
 * recompute the saved-context percentage on every toggle) and on the
 * server (when we eventually generate the MCP code). One source of truth.
 */

import type { Endpoint, ParsedSpec } from './types';

const BASE_TOKENS_PER_ENDPOINT = 25;
const TOKENS_PER_PARAM = 20;
const CHARS_PER_TOKEN = 5;

/**
 * Tokens an endpoint contributes once embedded in an MCP tool declaration
 * (name + description + Zod input schema). See `scripts/calibrate-tokens.ts`
 * for the artefact this is calibrated against.
 */
export function estimateEndpointTokens(endpoint: Endpoint): number {
  const text = endpoint.description ?? endpoint.label ?? '';
  return (
    BASE_TOKENS_PER_ENDPOINT +
    TOKENS_PER_PARAM * endpoint.params.length +
    Math.ceil(text.length / CHARS_PER_TOKEN)
  );
}

export function estimateSpecTokens(spec: ParsedSpec): number {
  let total = 0;
  for (const group of spec.groups) {
    for (const endpoint of group.endpoints) {
      total += estimateEndpointTokens(endpoint);
    }
  }
  return total;
}

export interface EconomyResult {
  /** Tokens contributed by the user-selected subset of endpoints. */
  selected: number;
  /** Tokens contributed by the entire parsed spec. */
  total: number;
  /**
   * Percentage of context saved vs. exposing the full spec, rounded to the
   * nearest integer. Always in `[0, 100]`. Defaults to `100` when the spec
   * is empty (degenerate but explicit: nothing exposed = nothing wasted).
   */
  percent: number;
}

export function computeEconomy(
  spec: ParsedSpec,
  selectedIds: readonly string[]
): EconomyResult {
  const total = estimateSpecTokens(spec);
  if (total === 0) {
    return { selected: 0, total: 0, percent: 100 };
  }
  const selectedSet = new Set(selectedIds);
  let selected = 0;
  for (const group of spec.groups) {
    for (const endpoint of group.endpoints) {
      if (selectedSet.has(endpoint.id)) {
        selected += estimateEndpointTokens(endpoint);
      }
    }
  }
  const percent = Math.round((1 - selected / total) * 100);
  return { selected, total, percent };
}
