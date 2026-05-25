# Plan : Phase 08 — Endpoint /api/generate + ZIP streaming + re-validation serveur

Date : 2026-05-25
SPEC : .workflow/SPEC.md (R1.4.1, R1.4.1bis, R1.4.1ter, R1.4.2, R1.4.3, R1.4.4, R1.6.2, R1.6.8)
Statut : DRAFT

## Objectif

Exposer la route `POST /api/generate` qui re-valide la spec côté serveur, applique le générateur (phase 07), et stream un ZIP en réponse HTTP. Limite body 15 Mo, codes d'erreur cadrés.

## Fichiers impactes

- [ ] `src/server/routes/generate.ts` — handler POST /api/generate
- [ ] `src/server/services/zip-builder.ts` — wrapper archiver in-memory streaming
- [ ] `src/server/index.ts` — register route + middleware `express.json({ limit: '15mb' })` (R1.6.8 posée ici, vérifiée en phase 11)
- [ ] `src/client/lib/api.ts` — wrapper `apiGenerate(req): Promise<{blob, mcpName}>` (consommé par phase 10)
- [ ] `src/shared/types.ts` — type `ApiError` + codes (`INVALID_SPEC`, `NO_ENDPOINT_SELECTED`, `PAYLOAD_TOO_LARGE`, `GENERATION_FAILED`, `TIMEOUT`)

## Taches

- [ ] 1. Installer deps : `archiver`, `@types/archiver`
- [ ] 2. Implémenter `zip-builder.buildStream(files: Map<string, string|Buffer>): Readable` :
  - Instancie un `archiver('zip', { zlib: { level: 6 } })`
  - Append chaque entry depuis la Map
  - Finalize et retourne le stream
  - Pas d'écriture disque (R1.4.3)
- [ ] 3. Définir contrat HTTP `/api/generate` :
  - Body : `GenerateRequest` validé via Zod (réutilise le schéma de phase 07)
  - Response succès : `200`, `Content-Type: application/zip`, `Content-Disposition: attachment; filename="<mcpName>.zip"`, stream
  - Response erreur : `{ code: ApiErrorCode, message: string }` JSON
- [ ] 4. Implémenter `generate.ts` handler :
  - Valide body Zod (échec → 400 `INVALID_SPEC` avec détails Zod)
  - **Re-parse** la spec via `parser.parse()` (phase 02), garde-fous identiques (timeout 5s, profondeur 20, safe) (R1.4.1bis)
  - Filtre `selectedIds` ∩ ids présents après re-parse (R1.4.1ter)
  - Si 0 id valide → 400 `NO_ENDPOINT_SELECTED`
  - Appelle `mcp-generator.generate()` (phase 07)
  - Stream ZIP via `zip-builder` directement dans `res`
  - Wrap dans un timeout 30s : si dépassé → annule + 504 `TIMEOUT` (R1.4.4)
- [ ] 5. Register middleware `express.json({ limit: '15mb' })` spécifiquement sur la route /api/generate, **avant** le handler. Erreur de body trop gros → 413 `PAYLOAD_TOO_LARGE` (cadré par le middleware Express, message standardisé).
- [ ] 6. Error handler : aucune stacktrace en prod, codes internes mappés aux messages utilisateur
- [ ] 7. Implémenter `client/lib/api.ts` `apiGenerate(req)` :
  - `fetch('/api/generate', { method: 'POST', body: JSON.stringify(req), headers: {'Content-Type': 'application/json'} })`
  - Sur 2xx : extraire `mcpName` depuis Content-Disposition, retourner `{ blob: await res.blob(), mcpName }`
  - Sur erreur : throw `ApiError` typé

## Tests TDD

- [ ] `zip-builder.buildStream(files)` produit un ZIP qui se décompresse et contient tous les fichiers — `zip-builder.test.ts`
- [ ] `zip-builder` n'écrit rien dans `os.tmpdir()` (test fs.readdir before/after) — idem
- [ ] `POST /api/generate` retourne 200 + Content-Disposition correct sur req valide — `generate.test.ts`
- [ ] `POST /api/generate` retourne 400 `INVALID_SPEC` si Zod échoue — idem
- [ ] `POST /api/generate` retourne 400 `INVALID_SPEC` si re-parse échoue (spec corrompue côté client) — idem
- [ ] `POST /api/generate` retourne 400 `NO_ENDPOINT_SELECTED` si 0 id valide — idem
- [ ] `POST /api/generate` ignore les ids inconnus mais garde les valides (whitelist R1.4.1ter) — idem
- [ ] `POST /api/generate` retourne 413 sur body > 15 Mo — idem
- [ ] `POST /api/generate` retourne 504 `TIMEOUT` si la génération dépasse 30s (mock) — idem
- [ ] **Test perf R1.4.4** : génération + download < 5s p95 sur fixture shopify-50 — `generate.perf.test.ts`
- [ ] **Test perf R1.4.4 palier 200** : génération + download < 10s p95 sur fixture stripe-200 — idem
- [ ] **Test "no persistence" (R1.4.6)** : après `/api/generate`, aucun fichier nouveau dans `os.tmpdir()` — idem
- [ ] `apiGenerate(req)` retourne le bon blob + mcpName — `api.test.ts`
- [ ] `apiGenerate` throw `ApiError` typé sur 4xx/5xx — idem

## UAT

- Via curl : `curl -X POST http://localhost:3001/api/generate -H 'Content-Type: application/json' -d @payload.json -o out.zip` → ZIP reçu, décompressable.
- Body 20 Mo simulé → 413.
- 0 ids → 400 avec code `NO_ENDPOINT_SELECTED`.

## Documentation

- [ ] `docs/API.md` : section complète POST /api/generate (request schema, response headers, error codes)

## Definition of Done

- [ ] Tests TDD passent
- [ ] Tests perf passent (5s p95 / 10s palier)
- [ ] Test "no persistence" passe
- [ ] /security-review sans problème critique
- [ ] Commit + PR
