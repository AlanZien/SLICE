# Token estimator

SLICE displays a *"Context saved"* percentage in the selection sidebar so the
user understands how much agent context they're sparing by picking a subset
of endpoints instead of exposing the full spec. This document explains how
that number is computed, how the formula was calibrated, and the bounds we
guarantee.

## Where the number comes from

For each endpoint, we estimate the tokens that endpoint contributes to the
final MCP tool declaration (name + description + Zod input schema). The
estimate is a closed-form heuristic — no model call, no async work — so the
sidebar can update on every checkbox toggle without lag.

```
endpointTokens(ep) = 25 + 20 × params + ⌈description.length / 5⌉
```

- `25` — base cost: tool boilerplate (`server.tool(...)`, async handler skeleton)
- `20 × params` — each `z.string().optional().describe(...)` runs ~20 tokens
- `⌈len / 5⌉` — typical English/code ratio under `cl100k_base`

The "real" reference is the tiktoken `cl100k_base` count on the exact MCP
tool source we'd emit. We don't compare against arbitrary spec text —
that would calibrate the wrong thing.

## Calibration (phase 05)

Coefficients were tuned by grid search against four fixtures of increasing
size, then frozen in `src/shared/token-estimator.ts`.

| Fixture | Endpoints | Real tokens (tiktoken) | Estimate | Deviation |
|---|---:|---:|---:|---:|
| `custom-10.yaml` | 10 | 885 | 877 | −0.9% |
| `shopify-50.yaml` | 50 | 2270 | 2226 | −1.9% |
| `github-100.yaml` | 100 | 11243 | 11087 | −1.4% |
| `stripe-200.yaml` | 200 | 22063 | 22631 | +2.6% |

**Worst-case deviation: 2.6%** — well within the **±15% SPEC R1.2.8 budget**.

### How to re-run

```bash
pnpm tsx scripts/calibrate-tokens.ts
```

The script reloads every file in `fixtures/calibration/`, grid-searches the
coefficient space (base ∈ 20..80, perParam ∈ 0..20, charsPerToken ∈ 2..6),
prints the best per-fixture deviations and exits non-zero if the chosen
coefficients miss ±15%.

### CI guard

`src/server/services/token-estimator.calibration.test.ts` re-checks the
deviation in CI. If anyone tweaks the parser shape, the normalizer, or the
coefficients themselves in a way that pushes any fixture over ±15%, the
build fails. The offline script (`calibrate-tokens.ts`) is then the place to
re-tune.

## Limits

- **English-only bias**: `cl100k_base` is slightly less efficient on Asian
  scripts and accented Latin. Specs with mostly French/Spanish descriptions
  may skew a couple percent higher; still well inside the budget on the
  Shopify fixture (which has accent-light English content).
- **Tool-name length is fixed**: the calibration assumes the MCP tool name
  is `${METHOD} ${path}` (~10–40 chars). Very long custom paths or hashed
  operationIds may diverge.
- **No fudge for nested schemas**: today the formula doesn't read `requestBody`
  shape. Phase 04 (parser) doesn't expose it yet. When phase 06 wires
  `requestBody`, the per-param coefficient will need to be re-checked — the
  CI calibration test will catch regressions.
- **Heuristic, not promise**: 2.6% on synthetic fixtures doesn't guarantee
  2.6% on every real-world spec. The 15% bound is what's contractual.

## When to escalate

If a future fixture pushes any deviation past 15%, SPEC R1.2.8 says we
escalate: change strategy (e.g. expose a server-side `/api/tokens-estimate`
endpoint that runs tiktoken on demand) rather than tweak coefficients in
ways that overfit the calibration set.
