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

---

## Phase 04 : Écran de sélection (2026-05-26)

### Tests techniques

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 138/138 verts (24 fichiers) | ✓ | +47 tests vs phase 03 (useSelection, MethodBadge, EndpointRow, EndpointGroup, SearchBox, BulkActions, Sidebar, ApiHeader, SelectionScreen, keyboard, perf) |
| 2 | `pnpm typecheck` → exit 0 | ✓ | strict |
| 3 | `useSelection(spec)` pré-coche tous les GET (R1.2.7) | ✓ | |
| 4 | `bulkCheck(predicate, visible?)` respecte le filtre (R1.2.6) | ✓ | |
| 5 | `bulkUncheck()` vide la sélection (R1.2.6) | ✓ | conforme SPEC |
| 6 | `<MethodBadge>` couleurs distinctes par méthode | ✓ | |
| 7 | `<EndpointRow>` toggle au click via `<label>` (HTML valide a11y) | ✓ | |
| 8 | `<EndpointGroup>` accordéon, ouvert par défaut (R1.2.4), compteur X/Y | ✓ | |
| 9 | `<SearchBox>` filtre case-insensitive label + path (R1.2.5) | ✓ | |
| 10 | ⌘K / Ctrl+K focus la recherche | ✓ | preventDefault |
| 11 | `<SelectionSidebar>` bouton "Continue" désactivé si count=0 (R1.2.9) | ✓ | |
| 12 | `<ApiHeader>` édition inline baseURL (Enter commit, Esc cancel) | ✓ | |
| 13 | Perf parser p95 < 2s sur shopify-50 (R1.1.9) | ✓ | |
| 14 | Perf parser p95 < 3s sur aws-500 (500 endpoints) | ✓ | |
| 15 | Perf filtre client p95 < 100ms sur 500 endpoints (R1.2.5) | ✓ | |

### Tests métier à valider par l'utilisateur

- [ ] Upload `fixtures/shopify-50.yaml` → écran 2 affiche 10 groupes, GET pré-cochés
- [ ] Toggle quelques endpoints, voir compteur sidebar à jour
- [ ] Recherche "products" → seuls les endpoints products visibles
- [ ] Click "Check all writes" → POST/PUT/DELETE visibles cochés
- [ ] Click "Uncheck all" → tout décoché, bouton Continue désactivé
- [ ] ⌘K focus la searchbox depuis n'importe où sur la page
- [ ] Click sur la baseURL → édition inline, Enter sauvegarde, Esc annule
- [ ] Click "Continue" → écran 3 placeholder avec liste des ids sélectionnés
- [ ] Upload `fixtures/aws-500.yaml` (500 endpoints, 100 groupes) → écran 2 reste fluide, recherche temps réel

### Findings reportés (non bloquants)

- Tâche 12 du PLAN (qualification light : `UNSUPPORTED_AUTH`, exclusion endpoints sans description, toggle deprecated) **non implémentée** — ajoutée au plan entre les sessions et non vue à temps. À traiter en phase 06 ou reporter V1.1 (BACKLOG.md déjà alimenté).
- `baseUrl` édité dans `<ApiHeader>` n'est pas propagé à `App.tsx` — TODO inline dans `selection.tsx` pour phase 06.
- Accent folding manquant (`matchesQuery`) — reporter V1.1 pour specs FR/ES/JP.
- `selectedCount` recalculé sans memo dans `EndpointGroup` — watch perf si jank observé.

---

## Phase 05 : Compteur tokens (2026-05-26)

### Tests techniques

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 173/173 verts (27 fichiers) | ✓ | +23 tests vs phase 04 |
| 2 | `pnpm typecheck` → exit 0 | ✓ | |
| 3 | Calibration `pnpm tsx scripts/calibrate-tokens.ts` → PASS | ✓ | worst dev 2.6% sur 4 fixtures |
| 4 | Tests calibration CI (`token-estimator.calibration.test.ts`) → 4 fixtures sous ±15% | ✓ | |
| 5 | `estimateEndpointTokens(minimal)` = 25 (base seule) | ✓ | |
| 6 | `computeEconomy(spec, [])` = 100% | ✓ | |
| 7 | `computeEconomy(spec, all)` = 0% | ✓ | |
| 8 | `computeEconomy(emptySpec, [])` = 100% (degenerate) | ✓ | |
| 9 | `<EconomyCounter percent=-5>` clampe à 0% | ✓ | |
| 10 | `<EconomyCounter percent=150>` clampe à 100% | ✓ | |
| 11 | `<EconomyCounter percent=NaN>` clampe à 0% (defensive) | ✓ | |
| 12 | `js-tiktoken` épinglé en exact version `1.0.21` | ✓ | |

### Tests métier à valider

- [ ] Upload `fixtures/shopify-50.yaml` → écran 2 : counter affiche un % entre 30-70% (50 endpoints, ~25 GETs pré-cochés = ~50% économisé)
- [ ] Click "Check all writes" → le compteur baisse (plus d'endpoints sélectionnés = moins économisé)
- [ ] Click "Uncheck all" → counter monte à 100%
- [ ] Toggle individuel : counter change en live à chaque click
- [ ] Continue désactivé tant que counter = 100% (R1.2.9)
- [ ] Upload `fixtures/aws-500.yaml` → counter cohérent + recherche reste fluide
- [ ] Upload une vraie spec publique (Stripe ou GitHub réelle) → counter dans la même fourchette que les fixtures synthétiques

### Coefficients de la formule (frozen)
```
base = 25 tokens / endpoint
perParam = 20 tokens / parameter
charsPerToken = 5 (description.length / 5)
```

Methodologie complète : [docs/token-estimator.md](../docs/token-estimator.md).

---

## Phase 04bis : Refonte écran 2 (layout 3-col Raycast) — 2026-05-28

### Pourquoi

Phase 04 avait livré un layout 2-col (accordéons + sidebar droite). La maquette JSX validée (`hifi-screen-2.jsx`) décrit un 3-col Raycast split. Refactor dédié pour aligner sur la maquette avant d'implémenter les écrans 3-4.

### Tests techniques

| # | Scenario | Résultat |
|---|----------|----------|
| 1 | `pnpm test` → 187/187 verts | ✓ |
| 2 | `pnpm typecheck` → exit 0 | ✓ |
| 3 | `useSelection` expose `focused` + `tagCounts` | ✓ |
| 4 | `<TagRail>` rend "All" + tags avec compteurs picked/total | ✓ |
| 5 | `<TagRail>` highlight via aria-current sur tag actif | ✓ |
| 6 | `<EndpointPreview>` affiche méthode/path/label/desc/params/cost | ✓ |
| 7 | `<EndpointPreview>` "Add to MCP" vs "Included in MCP" selon état | ✓ |
| 8 | `<FilterChips>` All/Reads/Writes avec aria-pressed | ✓ |
| 9 | `<StickyFooter>` désactive Continue si count=0, raccourci ↵ visible | ✓ |
| 10 | `<EndpointRow>` clic body = focus, clic checkbox = toggle (séparés) | ✓ |
| 11 | `<SelectionScreen>` 3-col rendu, navigation tag, "All" tous endpoints | ✓ |
| 12 | Cleanup : 4 composants obsolètes supprimés (endpoint-group, selection-sidebar, bulk-actions, economy-counter) | ✓ |

### Tests métier à valider

- [ ] Upload `fixtures/shopify-50.yaml` → layout 3-col affiché : rail gauche avec 10 tags + bignum, liste centrale du premier tag, preview du premier endpoint à droite
- [ ] Click "Orders" dans le rail → liste change, preview suit le premier endpoint d'Orders
- [ ] Click "All" → tous les endpoints visibles
- [ ] Click sur une row → preview affiche cet endpoint
- [ ] Click sur la checkbox d'une row → toggle, preview ne change pas
- [ ] FilterChips Reads → seuls les GET visibles
- [ ] FilterChips Writes → seuls les POST/PUT/DELETE visibles
- [ ] Search "products" dans le tag Products → filtre dans le tag
- [ ] "↓ reads" bulk → tous les GET du tag actif cochés
- [ ] Footer affiche "X endpoints · −Y% context" en live
- [ ] Continue désactivé si count=0, sinon enabled avec raccourci ↵
- [ ] Click Back → retour écran 1 (reset)
- [ ] Toggle "Show deprecated" reste fonctionnel

---

## Phase 06 : Écran de configuration (2026-05-28)

### Tests techniques

| # | Scenario | Résultat |
|---|----------|----------|
| 1 | `pnpm test` → 269/269 verts (41 fichiers) | ✓ |
| 2 | `pnpm typecheck` → exit 0 | ✓ |
| 3 | `slugify` couvre kebab-case + accents + fallbacks `-mcp` / `mcp-server-<hash>` | ✓ |
| 4 | `auth-detector` priorise bearer > apiKey/header > apiKey/query | ✓ |
| 5 | `auth-detector` retourne `{type:'none'}` sur oauth2/basic/digest/custom | ✓ |
| 6 | `generateMcpServerToken` produit 32 chars hex uniques (crypto.randomBytes) | ✓ |
| 7 | `spec-normalizer` injecte `defaultConfig` avec slug + auth + token | ✓ |
| 8 | Schéma Zod `sliceConfigSchema` valide en discriminated union, exige `mcpServerToken` si mode != local | ✓ |
| 9 | `useConfig` normalise `mcpServerToken: ''` → `undefined` dans `config` ET la validation | ✓ |
| 10 | `<ConfigScreen>` rend les 3 dest cards + advanced toggle + generate button | ✓ |
| 11 | Auth read-only si détectée de la spec, éditable sinon | ✓ |
| 12 | Bouton Generate désactivé si form invalide | ✓ |
| 13 | Bouton Generate appelle `onGenerate(config)` avec payload complet | ✓ |
| 14 | Bouton Back appelle `onBack` (retour écran 2) | ✓ |
| 15 | Live preview rend MCP package card + ZIP structure + post-gen steps | ✓ |
| 16 | ZIP structure réagit au mode (`local`/`remote`/`both`) avec ✓ / — | ✓ |

### Tests métier à valider

**Cas 1 — Auth détectée (verrouillé)** : `fixtures/uat-apikey-auth.yaml`
- [ ] Section "Upstream authentication" = un seul bloc avec badge `AUTO-DETECTED` + `header · X-Shopify-Access-Token`
- [ ] Pas de boutons None/Bearer cliquables

**Cas 2 — Auth absente (éditable)** : `fixtures/uat-no-auth.yaml`
- [ ] 3 cards : None (active) / API Key / Bearer
- [ ] Click "API Key" → champ "Header name" éditable apparaît
- [ ] Click "Bearer" → le champ disparaît

**Live preview** :
- [ ] Changer le nom MCP → bignum + arborescence ZIP s'actualisent
- [ ] Changer le mode `local` → `remote` → l'arborescence ZIP montre ✓/— sur stdio vs http
- [ ] Sample des tools (jusqu'à 6) listé + "+ N more…" si plus
- [ ] Chips résumé : X endpoints, −Y% context (couleur emerald/amber/muted selon valeur), transport, auth

**Validation form** :
- [ ] Nom MCP avec espace → erreur "lowercase letters, digits and dashes only"
- [ ] URL invalide → erreur "must be a valid http(s) URL"
- [ ] Mode `remote` + `mcpServerToken` vide → bouton Generate désactivé
- [ ] Mode `local` + `mcpServerToken` vide → OK
- [ ] Click Generate (état valide) → écran 4 placeholder + log console (DEV only)

### Findings reportés (RETRO)

- Prototype pollution défensif sur `auth-detector` (low-risk, V1.1)
- Types OpenAPI custom non remontés à l'utilisateur (toast/log à ajouter)
- `FALLBACK_DEFAULT` dans `config.tsx` produit `mcpServerToken: ''` (cas inatteignable en pratique)
- Couplage phase 03 ↔ phase 06 à documenter (read-only auth dépend du filtre amont)
