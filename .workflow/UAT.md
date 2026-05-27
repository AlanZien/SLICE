# Cahier de recette

## Phase 01 : Squelette back + front + theming (2026-05-25)

### Tests techniques (générés par Claude depuis PLAN 01)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 20/20 verts (4 fichiers de tests) | ✓ | useTheme, Stepper, Topbar, /api/health |
| 2 | `pnpm typecheck` → exit 0 | ✓ | tsc -b strict mode |
| 3 | `pnpm build` → produit `dist/client/` et `dist/server/` | ✓ | front 197 KB / 62 KB gzipped |
| 4 | `pnpm dev` lance front (5173) et back (3001) en parallèle | ✓ | concurrently |
| 5 | `curl http://localhost:3001/api/health` retourne `{"ok":true,"status":"ok",...}` | ✓ | exempté du rate-limit |

### Tests métier / UX (validés par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Topbar affiche wordmark SLICE + breadcrumb `/new` + stepper étape 1 + ⌘K + Recommencer | ✓ | screenshot validé |
| 2 | "Curated MCP servers for AI agents" affiché en Fraunces italic, centré | ✓ | |
| 3 | Boutons dev `Étape 1/2/3/4` font basculer le stepper et le breadcrumb | ✓ | |
| 4 | Étape 2 → breadcrumb `/shopify-admin-api` | ✓ | |
| 5 | Toggle thème dark ↔ light met à jour palette, icône change | ✓ | |
| 6 | Thème persiste après F5 (localStorage) | ✓ | |
| 7 | Click "Recommencer" → revient à Étape 1, breadcrumb `/new` | ✓ | |
| 8 | Grille de points subtile visible sur le fond | ✓ | |

### Observations

- L'utilisateur a testé en light mode (probablement toggle déjà effectué). Dark par défaut au premier chargement avec localStorage vide (vérifié via test useTheme).
- Boutons dev shortcuts présents pour permettre la preview des écrans futurs. Gated `import.meta.env.DEV` → strippés en prod build.
- 6 findings "à considérer" loggés dans `.workflow/RETRO.md` pour LEARN (CORS, body limit, inline script, pattern `cn()`, padding topbar, couverture tests).

**Date d'execution :** 2026-05-25
**Version testée :** branche `feature/01-skeleton`

---
Ce fichier s'accumule au fil des features.
L'utilisateur fait sa recette quand il le souhaite — ce n'est PAS une etape bloquante du pipeline.
Genere par le workflow FORGE (phase DELIVER).

---

## Phase 02 : Upload & parsing OpenAPI 3.x (2026-05-25)

### Tests techniques (générés par Claude depuis PLAN 02)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 59/59 verts (9 fichiers de tests) | ✓ | parser (12), spec-normalizer (10), upload route (8), dropzone (6), upload screen (3), + phase 01 |
| 2 | `pnpm typecheck` → exit 0 | ✓ | tsc -b strict mode |
| 3 | POST /api/upload sans `file` → 400 `NO_FILE` | ✓ | |
| 4 | POST /api/upload avec `.txt` → 415 `UNSUPPORTED_FORMAT` | ✓ | |
| 5 | POST /api/upload avec buffer 11 Mo → 413 `PAYLOAD_TOO_LARGE` | ✓ | limite multer |
| 6 | POST /api/upload avec YAML cassé → 400 `INVALID_SPEC` | ✓ | |
| 7 | POST /api/upload avec spec `paths: {}` → 400 `EMPTY_SPEC` | ✓ | R1.1.7 |
| 8 | POST /api/upload avec `swagger: "2.0"` → 400 `UNSUPPORTED_VERSION` | ✓ | phase 03 ajoutera la conversion |
| 9 | parseSpec rejette `$ref: "http://..."` et `file://...` → INVALID_SPEC | ✓ | anti-SSRF |
| 10 | parseSpec rejette YAML profondeur 25 → PARSE_DEPTH_EXCEEDED | ✓ | R1.1.6 |
| 11 | parseSpec rejette `!!js/function` → INVALID_SPEC | ✓ | R1.1.4 anti-bomb |
| 12 | parseSpec préserve `required: true` natif (booléen YAML) | ✓ | CORE_SCHEMA, fix critique |

### Tests métier / UX (validés par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Écran 1 : hero "Curated MCP servers for AI agents" + dropzone visible | ✓ | screenshot validé |
| 2 | Drag&drop ou clic dropzone → file picker s'ouvre, accepte `.json/.yaml/.yml` | ✓ | |
| 3 | Upload `fixtures/shopify-50.yaml` → bascule sur écran 2 | ✓ | parsing OK |
| 4 | Écran 2 affiche `apiName` "Shopify Sample" + "50 endpoints, 10 groupes" | ✓ | screenshot validé |
| 5 | Breadcrumb passe à `/shopify-sample` (slug auto-généré) | ✓ | |
| 6 | Stepper passe sur étape 2 "Sélection" | ✓ | |
| 7 | Debug ParsedSpec (dev only) montre `required: true` sur path params, `required: false` sur query `limit` | ✓ | CORE_SCHEMA tient bout en bout |
| 8 | Click "Recommencer" → retour écran 1, parsedSpec/apiSlug reset | ✓ | |

### Tests métier à compléter par l'utilisateur (non bloquant)

- [ ] Upload d'un vrai spec public (Stripe / GitHub / Shopify) > 100 endpoints
- [ ] Upload d'un YAML avec BOM UTF-8/UTF-16 — comportement attendu : rejet INVALID_SPEC
- [ ] Test rate-limit : 31e upload en moins d'une minute → 429
- [ ] Test cross-browser : Safari, Firefox (react-dropzone MIME detection peut différer)

### Observations

- Le fix CORE_SCHEMA était critique : sans lui, toute spec YAML avec `required: true` (cas standard sur path params) était rejetée par swagger-parser. Bug détecté par `/simplify`, non visible dans les tests initiaux car la fixture VALID_YAML n'avait pas de params required. Test de non-régression ajouté.
- Le fix SSRF (`assertNoExternalRefs`) bloque proactivement les `$ref` externes — utile pour AWS metadata endpoint et lectures fichiers.
- Performance non mesurée en phase 02 (R1.1.9 p95 < 2s sur shopify-50). Reporté en phase 04 quand l'écran de sélection consommera réellement le ParsedSpec à l'écran.

---

## Phase 03 : Conversion automatique Swagger 2.0 + Postman v2 (2026-05-25)

### Tests techniques (générés depuis PLAN 03)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 80/80 verts (11 fichiers) | ✓ | format-detector (6), format-converter (8), parser (15), upload (12), + phase 01/02 |
| 2 | `pnpm typecheck` → exit 0 | ✓ | tsc -b strict, déclaration ambient pour swagger2openapi |
| 3 | `detectFormat()` retourne `openapi3`/`swagger2`/`postman`/`unknown`/`unparseable` selon entrée | ✓ | |
| 4 | `convertToOpenAPI3()` passthrough OpenAPI 3.x | ✓ | hot path |
| 5 | `convertToOpenAPI3()` convertit petstore Swagger 2.0 → OpenAPI 3.0 valide | ✓ | swagger2openapi avec `fetch:false / resolve:false` |
| 6 | `convertToOpenAPI3()` convertit shopify Postman v2 → OpenAPI 3 valide | ✓ | postman-to-openapi |
| 7 | `convertToOpenAPI3()` throw `UNSUPPORTED_FORMAT` sur GraphQL SDL | ✓ | |
| 8 | `convertToOpenAPI3()` throw `SWAGGER2_CONVERSION_FAILED` sur Swagger 2.0 corrompu (paths non-object) | ✓ | `isPlausibleOpenApi3` post-check |
| 9 | `convertToOpenAPI3()` throw `POSTMAN_CONVERSION_FAILED` sur Postman corrompu | ✓ | post-check symétrique |
| 10 | `convertToOpenAPI3()` throw `INVALID_SPEC` sur input vide / whitespace | ✓ | |
| 11 | `POST /api/upload` retourne 200 + ParsedSpec sur petstore-swagger2.json | ✓ | conversion silencieuse |
| 12 | `POST /api/upload` retourne 200 + ParsedSpec sur shopify-postman-v2.json | ✓ | conversion silencieuse |
| 13 | `POST /api/upload` retourne 415 UNSUPPORTED_FORMAT sur graphql-sdl.txt renommé .yaml | ✓ | |
| 14 | `parseSpec()` enveloppe la conversion dans le timeout (vi.spyOn hang) | ✓ | DoS guard étendu |
| 15 | `assertNoExternalRefs` court-circuite swagger2openapi sur $ref `http://169.254.169.254/...` | ✓ | défense en profondeur |

### Tests métier validés par l'utilisateur (UAT manuelle 2026-05-25)

- [x] Upload `fixtures/petstore-swagger2.json` → écran 2 "Petstore (Swagger 2.0)" + 4 endpoints / 2 groupes (screenshot validé)
- [x] Upload `fixtures/shopify-postman-v2.json` → écran 2 "Shopify Storefront (Postman v2.1 fixture)" + 3 endpoints / 2 groupes ; ParsedSpec montre params `required: false` natif et `Accept` header header bien typé (screenshot validé)
- [x] Upload `fixtures/graphql-sdl.txt` (extension `.txt`, non renommée) → dropzone error "Unsupported file format. Use JSON or YAML." via filtre extension côté back (screenshot validé)
- [ ] Upload d'un vrai Swagger 2.0 public (Petstore officiel via curl) — optionnel
- [ ] Upload d'un vrai Postman Collection v2 public (Stripe API Postman) — optionnel
- [ ] Upload de `graphql-sdl.yaml` (renommé) → message phase 03 "Use OpenAPI 3.x, Swagger 2.0, or Postman Collection v2" — optionnel (chemin format-detector au lieu de filtre extension)

### Observation UAT — limite Postman documentée

Path `:id.json` dans une Postman Collection devient `/{id.json}` après conversion (au lieu de `/{id}.json`). Limite intrinsèque de `postman-to-openapi` — il prend tout le segment Postman comme nom de paramètre. À documenter sur l'écran de sélection (phase 04) si on veut prévenir l'utilisateur des collections Postman qui collent `:id.json`.

### Observations

- Pas de breaking change visible côté client (le ParsedSpec retourné est identique).
- Conversion ajoute ~50-300ms selon la taille (sur fixtures < 100 endpoints).
- Test de perf p95 (PLAN §35, §52, §53) non implémenté en phase 03 — reporté en phase 04 dans le même batch perf (cf. RETRO).
- Recodage UNSUPPORTED_VERSION : Swagger 1.x renvoie maintenant UNSUPPORTED_FORMAT (415) au lieu de UNSUPPORTED_VERSION (400). Sémantiquement plus juste. Documenté dans docs/API.md.
- Sécurité : `withTimeout` enveloppe maintenant TOUT le pipeline (conversion incluse) — fix critique trouvé par verifier audit, sinon DoS possible via Postman lourd.
