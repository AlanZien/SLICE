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
