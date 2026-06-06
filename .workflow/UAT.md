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


## Phase 07 : Templates MCP + générateur de fichiers (2026-05-28)

### Tests techniques (générés depuis PLAN 07)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 309 verts (44 fichiers) | ✓ | inclut snapshot + tsc smoke |
| 2 | `pnpm typecheck` → exit 0 | ✓ | strict |
| 3 | `generateMcp(req)` retourne 8 fichiers avec les bons chemins | ✓ | `mcp-generator.test.ts` |
| 4 | `src/tools.ts` contient autant de `server.tool(` que de `selectedIds` | ✓ | snapshot test |
| 5 | `src/index.ts` contient les transports attendus selon `mode` (`local`/`remote`/`both`) | ✓ | 3 tests dédiés |
| 6 | `http-client.ts` injecte le header d'auth correct selon `upstreamAuth.type` | ✓ | apiKey / bearer / none |
| 7 | `.env.example` contient les bonnes variables selon auth + mode | ✓ | |
| 8 | `package.json` interpole `mcpName`, déclare SDK + zod | ✓ | |
| 9 | README contient snippet Claude Desktop si stdio actif, snippet Bearer si http actif | ✓ | |
| 10 | Bundle généré sur `fixtures/shopify-50.yaml` compile via `tsc --noEmit` | ✓ | smoke test fin de pipeline |

### Tests métier / UX (à valider plus tard quand l'endpoint `/api/generate` sera branché)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Télécharger un ZIP pour `shopify-50.yaml` + 10 endpoints sélectionnés | ⏳ | nécessite phase 08 |
| 2 | `pnpm install && pnpm build` dans le bundle téléchargé → exit 0 | ⏳ | manuel |
| 3 | `MCP_TRANSPORT=stdio pnpm start` lance le serveur, accepte requête `tools/list` | ⏳ | manuel |
| 4 | `MCP_TRANSPORT=http pnpm start` écoute sur :8787, refuse sans Bearer | ⏳ | manuel |

### Observations

- Le smoke `tsc --noEmit` du bundle a forcé deux corrections clés : passage à `McpServer` (le `Server` bas-niveau n'a pas `.tool()`), et schémas d'inputs en `ZodRawShape` plutôt qu'en `z.object({...})` (exigence du SDK).
- Mode `'http'` n'existe pas dans `DeploymentMode` — la valeur correcte est `'remote'`. À refléter dans la doc utilisateur de l'écran config.


## Phase 08 : Endpoint /api/generate + ZIP streaming (2026-05-28)

### Tests techniques (générés depuis PLAN 08)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 325 verts (48 fichiers) | ✓ | inclut perf + no-persistence |
| 2 | `pnpm typecheck` → exit 0 | ✓ | strict |
| 3 | `buildZipStream(files)` produit un ZIP décompressable via yauzl | ✓ | `zip-builder.test.ts` |
| 4 | `buildZipStream` ne laisse aucun fichier dans `os.tmpdir()` | ✓ | inspect before/after |
| 5 | `POST /api/generate` 200 + Content-Disposition `<mcpName>.zip` | ✓ | supertest |
| 6 | 400 `INVALID_SPEC` si Zod échoue | ✓ | |
| 7 | 400 `INVALID_SPEC` si re-parse échoue | ✓ | rawSpec corrompu |
| 8 | 400 `NO_ENDPOINT_SELECTED` si 0 id valide | ✓ | whitelist (R1.4.1ter) |
| 9 | Whitelist : ids inconnus ignorés, valides gardés | ✓ | |
| 10 | 413 `PAYLOAD_TOO_LARGE` sur body > 15 Mo | ✓ | router-level json(15mb) |
| 11 | p95 < 5 s sur shopify-50 | ✓ | 5 mesures après 3 warm-ups |
| 12 | p95 < 10 s sur aws-500 (500 endpoints) | ✓ | palier volume |
| 13 | `apiGenerate(req)` retourne {blob, filename} sur 200 | ✓ | client/lib/api.test.ts |
| 14 | `apiGenerate` throw `ApiError` typé sur 4xx | ✓ | |

### Tests métier / UX (validés par l'utilisateur ou à valider)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `curl -X POST /api/generate -d @payload.json -o out.zip` → ZIP décompressable | ⏳ | manuel — quand le client branchera apiGenerate (phase 09) |
| 2 | ZIP décompressé + `pnpm install && pnpm build` → exit 0 | ⏳ | manuel |
| 3 | Body 20 Mo → 413 avec code `PAYLOAD_TOO_LARGE` | ✓ | test automatisé couvre |
| 4 | 0 ids → 400 avec code `NO_ENDPOINT_SELECTED` | ✓ | test automatisé couvre |

### Findings reportés (RETRO)

- **withTimeout n'annule pas la promesse sous-jacente** : si `generateMcp` boucle, le timer 30s rejette mais la promesse continue jusqu'à résolution naturelle. Acceptable car `generateMcp` est synchrone court ; à revoir si une étape async lourde s'ajoute.
- **parsedSpec dans le body est redondant avec rawSpec** : seul `rawSpec` est réellement utilisé côté serveur (re-parse). À considérer en V1.1 de retirer pour alléger le payload.
- **Bypass conditionnel global json sur `/api/generate`** : fonctionne mais fragile pour de futurs sous-chemins. Pattern à documenter ou refactor en route-spécifique.
- **archiver v8 + @types/archiver v7** : shim local `src/server/types/archiver-v8.d.ts`. À supprimer dès que `@types/archiver` rattrape la v8.


## Phase 10 : Écran de succès + câblage Generate → Success (2026-05-28)

### Tests techniques (générés depuis PLAN 10)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 356 verts (55 fichiers) | ✓ | inclut snippet builders + ConnectionTabs + SuccessScreen |
| 2 | `pnpm typecheck` → exit 0 | ✓ | strict |
| 3 | `buildClaudeDesktopSnippet` produit un JSON valide avec env (apiKey/bearer/none) | ✓ | snippets.test.ts |
| 4 | `buildN8nSnippet` / `buildAiriaSnippet` incluent le MCP_SERVER_TOKEN | ✓ | |
| 5 | `useDownload` déclenche le download au mount + expose redownload() qui réutilise le blob | ✓ | use-download.test.ts |
| 6 | `<Toast>` success auto-dismiss 4 s, error auto-dismiss 6 s avec role=alert | ✓ | toast.test.tsx |
| 7 | `<CodeSnippet>` copie clipboard + affiche "Copied" pendant 1.5 s | ✓ | code-snippet.test.tsx |
| 8 | `<ConnectionTabs>` désactive Claude Desktop si mode=remote, n8n/Airia si mode=local | ✓ | connection-tabs.test.tsx |
| 9 | `<ConnectionTabs>` navigation ArrowRight cycle d'onglet | ✓ | |
| 10 | `<SuccessScreen>` affiche economy snapshot transmis (R1.5.6) | ✓ | success.test.tsx |
| 11 | App.tsx : clic Generate → POST /api/generate → state SuccessScreen | ✓ | wire complet |

### Tests métier / UX (à valider par utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Upload spec → sélection → config → clic "Generate" → écran 4 avec animation check | ⏳ | manuel |
| 2 | ZIP téléchargé automatiquement par le navigateur | ⏳ | manuel |
| 3 | Clic "Download again" → re-télécharge le même blob (pas de re-fetch serveur) | ⏳ | manuel |
| 4 | Onglet "Claude Desktop" actif par défaut (mode both) → snippet visible | ⏳ | manuel |
| 5 | Clic "Copy" → toast "Copied" + clipboard rempli | ⏳ | manuel |
| 6 | Mode local → onglets n8n/Airia grisés avec tooltip explicatif | ⏳ | manuel |
| 7 | "Generate another MCP" → retour écran 1 propre | ⏳ | manuel |
| 8 | "Back to selection" → écran 2 avec sélection préservée | ⏳ | manuel |
| 9 | Erreur serveur (ex. coupure réseau) → toast error visible | ⏳ | manuel |

### Findings reportés (RETRO)

- `URL.createObjectURL` non-implémenté en JSDOM : le test SuccessScreen le stub localement. Acceptable mais on pourrait factoriser via `test-setup.ts`.
- `apiGenerate` côté client utilise `res.blob()` → matérialise tout en mémoire. OK pour <1 MB. Si les bundles grossissent, envisager `res.body` streaming.

## Phase Pivot-1 : Écran « Où héberger ? » (2026-05-31)

### Tests techniques (générés par Claude depuis PLAN Pivot-1)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 372 verts (55 fichiers) | ✓ | +16 depuis la base 356 |
| 2 | `pnpm typecheck` → exit 0 | ✓ | strict |
| 3 | `sliceConfigSchema` : `hosting` requis (`cloud`/`self`), rejette absence/valeur inconnue (RC1.2/1.3) | ✓ | config-schema.test.ts |
| 4 | `sliceConfigSchema` : `mcpServerToken` optionnel quel que soit le mode (RC1.4) | ✓ | superRefine retiré |
| 5 | `useConfig` : `isValid=false` tant qu'aucun `hosting` choisi, `true` après (RC1.3) | ✓ | use-config.test.ts |
| 6 | `<ConfigScreen>` : 2 cards d'hébergement, plus de cards transport (RC1.2) | ✓ | config.test.tsx |
| 7 | `<ConfigScreen>` : bouton désactivé tant qu'aucun hébergement choisi (RC1.3) | ✓ | |
| 8 | `<ConfigScreen>` : libellé « Deploy to SLICE Cloud » (cloud) / « Download the kit » (self) (RC1.3) | ✓ | |
| 9 | `<ConfigScreen>` : champ « MCP server token » absent (RC1.4) | ✓ | |
| 10 | `<ConfigScreen>` : toggle « Detailed parameter descriptions » présent (RC1.5) | ✓ | |
| 11 | `<ConfigScreen>` : `onGenerate` reçoit un config avec `hosting` + `mode='remote'` | ✓ | |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Écran 3 affiche 2 cards « SLICE Cloud » (badge Recommended) et « On my server », bouton grisé | ⏳ | manuel |
| 2 | Clic « SLICE Cloud » → bouton actif lit « Deploy to SLICE Cloud » | ⏳ | manuel |
| 3 | Clic « On my server » → bouton lit « Download the kit » | ⏳ | manuel |
| 4 | « Advanced options » → plus de champ token, toggle descriptions présent | ⏳ | manuel |
| 5 | Nom invalide après choix d'hébergement → bouton re-désactivé | ⏳ | manuel |
| 6 | Cohérence visuelle des cards avec le design system (`DestCard`) | ⏳ | manuel |

### Findings reportés (RETRO)

Voir `.workflow/RETRO.md` § « Après phase Pivot-1 » : dette `mode`/`hosting` (à dériver en Pivot-2), `transportLabelFor` vestigial, libellés FR/EN à arbitrer, maquette hi-fi pivot à produire avant Pivot-3.

## Phase Pivot-2 : Kit Docker self-host (2026-05-31)

### Tests techniques (générés par Claude depuis PLAN Pivot-2)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 376 verts (55 fichiers) | ✓ | +4 tests Docker |
| 2 | `pnpm typecheck` → exit 0 | ✓ | strict |
| 3 | `generateMcp` émet un `Dockerfile` multi-stage (`EXPOSE 8787`, lance `dist/index.js`) (RC3.2) | ✓ | mcp-generator.test.ts |
| 4 | `generateMcp` émet `docker-compose.yml` (service = `mcpName`, port mappé, `env_file`) (RC3.2) | ✓ | |
| 5 | `generateMcp` émet `.dockerignore` excluant `.env`, `node_modules`, `dist` (RC3.2) | ✓ | |
| 6 | `README.md` contient « docker compose up » + déploiement PaaS (Coolify/Railway/Render) (RC3.2) | ✓ | |
| 7 | Snapshot du bundle : 11 fichiers (8 + 3 Docker) | ✓ | mcp-generator.snapshot.test.ts |
| 8 | `.env.example` contient toujours `MCP_SERVER_TOKEN` / `MCP_HTTP_PORT` (non régressé) | ✓ | tests static |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Télécharger le kit (« Download the kit »), décompresser → contient Dockerfile + docker-compose.yml + .dockerignore | ⏳ | manuel |
| 2 | `cp .env.example .env`, renseigner, `docker compose up -d` → MCP répond sur `:8787` (RC3.6, requiert Docker) | ⏳ | manuel — E2E non automatisé |
| 3 | README : instructions Docker + PaaS présentes et exactes | ⏳ | manuel |
| 4 | `.env.example` liste `UPSTREAM_*`, `MCP_SERVER_TOKEN`, `MCP_HTTP_PORT` | ⏳ | manuel |

### Findings reportés (RETRO)

Voir `.workflow/RETRO.md` § « Après phase Pivot-2 » : Docker docs inconditionnelles (OK car `mode` figé remote), E2E `docker build` en UAT manuel, `npm` vs `pnpm` dans le Dockerfile.

## Phase Pivot-3 : Mode relai d'auth (2026-05-31)

### Tests techniques (générés par Claude depuis PLAN Pivot-3)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 384 verts (57 fichiers) | ✓ | +3 E2E relai, +1 régression ALS, +structure |
| 2 | `pnpm typecheck` → exit 0 | ✓ | strict ; bundle généré compile via tsc smoke |
| 3 | Mécanisme : ALS traverse le SDK MCP (`handleRequest` → tool) | ✓ | relay-threading.test.ts (de-risk OQ-3) |
| 4 | **Runtime** : MCP en `relay` + `Bearer USERSECRET123` → l'amont reçoit l'API key = `USERSECRET123` (RC2.6) | ✓ | mcp-generator.relay.test.ts via `tsx` |
| 5 | **Runtime** : header absent → aucun credential amont (RC2.4) | ✓ | |
| 6 | **Runtime** : header mal formé (`Token …`) → aucun credential (RC2.7) | ✓ | |
| 7 | `http-client` lit `MCP_AUTH_MODE`, throw boot gaté sur `env` (RC2.1/2.3) | ✓ | |
| 8 | `UPSTREAM_BASE_URL` reste requis quel que soit le mode (RC2.3) | ✓ | |
| 9 | Sécurité : token relayé restreint à l'ASCII imprimable (anti-CRLF) | ✓ | fix EVALUATE, test de garde |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Générer un MCP, le lancer en `MCP_AUTH_MODE=relay`, appeler un tool depuis un agent avec son token → l'appel amont réussit avec ce token | ⏳ | manuel |
| 2 | Même bundle en `MCP_AUTH_MODE=env` (défaut) → self-host inchangé (token via `.env`) | ⏳ | manuel |
| 3 | Aucun log ne contient la valeur du header `Authorization` (RC2.5) | ⏳ | manuel — vérifié par revue de code (seul log = port) |

### Findings reportés (RETRO) — importants pour Pivot-4

Voir `.workflow/RETRO.md` § « Après phase Pivot-3 » :
- **Multi-session** : le serveur généré ne gère qu'une session à la fois (transport partagé) → à corriger pour l'hébergement multi-agents.
- **Contrôle d'accès relay** : repose entièrement sur l'URL non-devinable → exigence infra (entropie, 404 uniforme, pas de log d'URL).

## Pivot-4 — Runtime MCP hébergé / SLICE Cloud

### Tests techniques (générés depuis le PLAN)

| # | Scenario | Résultat | Test |
|---|----------|----------|------|
| 1 | Factory : MCP construit depuis une config, tools exposés, appel proxifié + token relayé (substitution path param) | ✓ | `hosted-mcp-factory.test.ts` |
| 2 | Factory : params `in:'header'` forwardés à l'amont (ex. `Notion-Version`), auth relay prioritaire | ✓ | `hosted-mcp-factory.test.ts` |
| 3 | Store : `put` rend un id ≥22 chars url-safe ; `get` rend la config ; id inconnu → undefined | ✓ | `hosted-store.test.ts` |
| 4 | Distilleur : `parsedSpec + selectedIds` → config (endpoints/baseURL/auth) | ✓ | `spec-to-hosted-config.test.ts` |
| 5 | `/m/:id` E2E : 2 agents en parallèle, chacun relaie son propre token | ✓ | `hosted-mcp.test.ts` |
| 6 | `/m/:id` sur id inconnu → 404 | ✓ | `hosted-mcp.test.ts` |
| 7 | `/api/host` rejette un `baseUrl` privé/loopback → `400 BLOCKED_HOST` (guard SSRF on) | ✓ | `hosted-mcp.test.ts` |
| 8 | SSRF guard : rejette loopback/privé/link-local/metadata + IPv4-mapped IPv6 | ✓ | `ssrf-guard.test.ts` |
| 9 | Client `apiHost` POST `/api/host` → `{ id, url }` ; ApiError typé sur 4xx | ✓ | `api.test.ts` |
| 10 | Snippets mode URL (Claude/n8n/Airia) : URL réelle + `COLLE_TON_TOKEN_ICI` | ✓ | `snippets.test.ts` |
| 11 | `ConnectionTabs` mode hosted : 3 onglets actifs, snippets URL | ✓ | `connection-tabs.test.ts` |
| 12 | `SuccessScreen` hosted : affiche l'URL, pas de bouton download | ✓ | `success.test.tsx` |

### Tests métier / UX (validés en session)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Parcours UI complet → bouton « Deploy to SLICE Cloud » → écran 4 avec URL + snippets | ✓ | validé visuellement (notion-api, 19 endpoints) |
| 2 | MCP hébergé appelé via `scripts/try-hosted.ts` avec vraie clé Notion → `GET /v1/users/me` renvoie le bot user | ✓ | test réel, workspace « Notion de GiveMe5 » |
| 3 | **Bout-en-bout dans Claude Desktop** : `slice-notion` (supergateway) → `list_all_users` renvoie les vrais users | ✓ | validé en session (UAT réel) |
| 4 | Écritures / recherche (POST avec body) | ✗ | **limite connue** — pas de forwarding du body (→ BACKLOG) |

### Findings reportés (RETRO/BACKLOG)

Voir `.workflow/RETRO.md` § « Après phase Pivot-4 » et la section dette du `BACKLOG.md` :
forwarding du body, cache McpServer (perf), durcissement SSRF DNS-rebinding, parité runtime↔kit, persistance du store, snippet Claude Desktop.

## Forwarding du body de requête

### Tests techniques (générés depuis le PLAN)

| # | Scenario | Résultat | Test |
|---|----------|----------|------|
| 1 | `toZodShape` : OpenAPI schema → ZodSchemaShape (object/array/required→requiredFields/additionalProperties/non-objet) | ✓ | `to-zod-shape.test.ts` |
| 2 | Builders : objets `.passthrough()` (clés extra conservées) ; parité kit↔runtime | ✓ | `zod-builders-parity.test.ts` |
| 3 | Parser aplatit le body en params `in:'body'` (+description, required, wireName) ; fallback ; non-JSON ignoré ; collision | ✓ | `spec-normalizer.body.test.ts` |
| 4 | Runtime hébergé : réassemble + envoie le corps ; `{}` quand vide ; requis manquant → pas d'appel ; collision→wireName ; auth/header intacts | ✓ | `hosted-mcp-factory.test.ts` |
| 5 | Kit généré : expose les body fields + passe `body: { … }` ; quoting hyphené ; fallback `body: args.body` | ✓ | `mcp-generator.body.test.ts` |
| 6 | Kit E2E (`tsx`) : le bundle généré envoie réellement le corps à l'amont | ✓ | `mcp-generator.relay.test.ts` |
| 7 | E2E pipeline complet : objet free-form à clés dynamiques transmis **intact** (passthrough) | ✓ | `body-forwarding.e2e.test.ts` |
| 8 | `spec-to-hosted-config` propage `in:'body'` + schema + wireName + description | ✓ | `spec-to-hosted-config.test.ts` |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Régénérer le MCP Notion hébergé, le rebrancher dans Claude Desktop, demander une **recherche** (`POST /v1/search`) → résultats réels | ⏳ | manuel — ferme le trou Pivot-4 |
| 2 | Création d'une page Notion via l'agent (`properties` à clés dynamiques) → page créée | ⏳ | manuel |

### Limites assumées (HORS SCOPE V2)
Content-types non-JSON (multipart/binaire), `enum`/`nullable`/`oneOf`/`anyOf`, aplatissement récursif au-delà du 1er niveau. GET+body : non envoyé (limite fetch/undici).

## Isolation mémoire du parsing (anti-OOM / anti-DoS, D004)

### Tests techniques (générés depuis le PLAN)

| # | Scenario | Résultat | Test |
|---|----------|----------|------|
| 1 | `PARSE_TOO_COMPLEX` (422) préservé à travers reparse-and-select (pas aplati en INVALID_SPEC) | ✓ | `reparse-and-select.test.ts` |
| 2 | `classifyExit` : timeout→PARSE_TIMEOUT, sinon→PARSE_TOO_COMPLEX | ✓ | `parse-isolated.test.ts` |
| 3 | Smoke : `parseSpecIsolated` parse une spec triviale dans un child (spawn Vitest OK) | ✓ | `parse-isolated.test.ts` |
| 4 | Équivalence : même `ParsedSpec` qu'in-process sur une spec riche (params/body/auth) | ✓ | `parse-isolated.test.ts` |
| 5 | Code d'erreur typé préservé (UNSUPPORTED_FORMAT, UNSUPPORTED_AUTH) à travers la frontière | ✓ | `parse-isolated.test.ts` |
| 6 | Spec >10 MB rejetée **sans spawn** (PAYLOAD_TOO_LARGE) | ✓ | `parse-isolated.test.ts` |
| 7 | **`$ref` bomb + timeout court → PARSE_TIMEOUT, et le parent SURVIT** (parse normal juste après OK) | ✓ | `parse-isolated.test.ts` |
| 8 | Sémaphore : file pleine → `ParseBusyError` ; queue dans le cap → pas de rejet | ✓ | `parse-isolated.test.ts` |
| 9 | Non-régression : upload/generate/host (20 tests) passent avec le parsing isolé | ✓ | route tests |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Uploader une spec « bombe »/DocuSign → l'UI affiche « trop complexe » et **le serveur reste debout** (autres requêtes OK) | ⏳ | manuel — ferme le DoS Pivot-corpus |

### Tests coûteux / non en CI (tracés)
- **OOM-pur via SIGABRT** : non testé en CI (l'OOM réel met ~132 s, flaky). Couvert par le test unitaire du classifieur + à valider en UAT manuel.
- **Smoke build prod du child** (T6) : **bloqué** par un bug pré-existant — le build prod compilé ne démarre pas (imports ESM sans extension `.js` + alias `@shared`). Tracé PROD-CRITIQUE au BACKLOG. La résolution de chemin du child est correcte par design (par extension de `import.meta.url`) ; vérifiable une fois le build prod réparé.

### Durcissements défense-en-profondeur (EVALUATE security-review)
Appliqués : env enfant **allowlisté** (aucun secret hérité), cap stdout enfant. Tracés : dépendance rate-limit amont, dimensionnement `concurrence × cap mémoire` vs RAM instance.

## Phase ci-pre-release : CI gate + pnpm figé (2026-06-02)

### Tests techniques (générés par Claude depuis le PLAN)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `hasRealBugs` → `true` si ≥1 verdict CRASH ou zodfail | ✓ | `corpus-check.test.ts` |
| 2 | `hasRealBugs` → `false` pour reject/toobig/fetcherr/ok et run vide | ✓ | `corpus-check.test.ts` |
| 3 | `corpus-check` importable sans déclencher `main()` (réseau) | ✓ | guard `import.meta.url` ; test importe le module |
| 4 | Suite complète verte (463 tests) avec scripts/ inclus dans Vitest | ✓ | `pnpm test` |
| 5 | `pnpm typecheck` → exit 0 | ✓ | tsc -b |
| 6 | `pnpm prod:smoke` → build + boot binaire compilé + 4 checks verts | ✓ | reproduit le gate CI en local |
| 7 | pnpm figé via `packageManager: pnpm@9.13.2` + `engines.node >=22` | ✓ | corepack en CI |
| 8 | Smoke tsc du bundle généré hermétique en CI (binaire `tsc` direct, pas `pnpm exec`) | ✓ | finding du gate : `pnpm exec` déclenchait un install implicite en CI cassant les symlinks |

### Tests métier / CI (validés par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `ci.yml` passe au vert sur la PR de cette phase (preuve réelle du gate) | ✓ | run #26808053054, 1m33s — a aussi attrapé le snapshot test non-CI-safe |
| 2 | `corpus.yml` lançable d'un clic (onglet Actions → Corpus check → Run workflow) | ⏳ | `workflow_dispatch` n'apparaît qu'une fois le fichier sur main → à valider **après merge** (limitation GitHub) |

## Phase OAuth-1a : détection & acceptation OAuth2 (2026-06-02)

### Tests techniques (générés par Claude depuis le PLAN)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Zod accepte `{oauth2, tokenUrl https, scopes?}` ; rejette tokenUrl absent/relatif/http (R9) | ✓ | `config-schema.test.ts` |
| 2 | `detectAuth` : clientCredentials → `{oauth2, tokenUrl, scopes}` (R1) | ✓ | `auth-detector.test.ts` |
| 3 | tokenUrl relatif résolu absolu via baseUrl (R2) | ✓ | `auth-detector.test.ts` |
| 4 | clientCredentials sans tokenUrl → bearer (R5) ; autres flows → bearer (R3) ; OIDC → bearer (R4) | ✓ | `auth-detector.test.ts` |
| 5 | Priorité oauth2-cc > bearer (R7) ; filtrage par schémas référencés (R7bis) ; fallback set vide → tous | ✓ | `auth-detector.test.ts` |
| 6 | Parser accepte oauth2 (cc/authCode) + OIDC, rejette basic/digest seuls (R6/R8) | ✓ | `parser.test.ts` |
| 7 | `normalizeSpec` propage `{oauth2, tokenUrl, scopes}` dans defaultConfig (B1/T7) | ✓ | `parser.test.ts` + `spec-normalizer.test.ts` |
| 8 | Non-régression : round-trip d'erreur typée via child_process (basique au lieu d'oauth2) | ✓ | `parse-isolated.test.ts` |
| 9 | Suite complète verte (473) + typecheck | ✓ | `pnpm test` / `pnpm typecheck` |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Uploader une vraie spec OAuth2 (ex. une API APIs.guru en client_credentials) → n'est plus refusée, arrive à l'écran de sélection | ⏳ | manuel — le code généré OAuth viendra en 1b |

## Phase OAuth-1b : flow client_credentials self-host (2026-06-02)

### Tests techniques (générés depuis le PLAN)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Kit oauth2 POST le token : Basic(id:secret) + grant_type + scope (R11) | ✓ | banc runtime double-mock |
| 2 | access_token obtenu attaché en Bearer à l'upstream (R12) | ✓ | runtime |
| 3 | Cache : expiry long→1 POST ; =0→2 POST ; absent→300s→1 POST (R13) | ✓ | runtime séquentiel |
| 4 | Dédup concurrence : 3 getAccessToken parallèles → 1 fetch (R14) | ✓ | module isolé |
| 5 | Retry 401 : refetch 1× + rejoue (R15) | ✓ | runtime |
| 6 | Token endpoint 500 / token_type≠bearer → abort avant upstream (R16/bis) | ✓ | runtime |
| 7 | Refuse de démarrer sans client_id/secret en mode env (R10) | ✓ | runtime |
| 8 | Relay : token agent relayé, aucun POST tokenUrl (R20) | ✓ | runtime |
| 9 | Secret lu via env, jamais dans un message d'erreur (R17/bis) | ✓ | statique |
| 10 | .env.example documente les vars oauth2 (R18) | ✓ | statique |
| 11 | Bundle oauth2 type-checke (tsc) + oauth-token.ts émis (R19) | ✓ | snapshot |
| 12 | **Sécurité** : tokenUrl/scopes hostiles JSON-encodés → pas d'injection de code | ✓ | finding security-review (2 HIGH RCE) corrigé |
| 13 | **Sécurité** : Zod rejette tokenUrl/scopes avec caractères de breakout | ✓ | config-schema |
| 14 | Non-régression : 487 tests verts + typecheck | ✓ | suite complète |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Générer + self-host un MCP pour une vraie API en client_credentials (ex. une API B2B) → l'agent l'utilise sans gérer le token | ⏳ | manuel, après 1d (UI) |

## Phase OAuth-1c : relai OAuth dans le runtime hébergé (2026-06-02)

### Tests techniques

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Runtime hébergé : upstream oauth2 → relaie le Bearer de l'agent (R21) | ✓ | `hosted-mcp-factory.test.ts` |
| 2 | Aucun appel au token endpoint côté cloud (R22) | ✓ | garanti structurellement (pas de logique tokenUrl) |
| 3 | Non-régression : 488 tests verts + typecheck | ✓ | |

## Phase OAuth-1d : UI config OAuth + mesure de couverture (2026-06-02)

### Tests techniques

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Suite complète verte (488) + typecheck | ✓ | |
| 2 | Gain de couverture corpus : 0 rejet OAuth (Stripe & co passent en `ok`) | ✓ | `pnpm corpus:check 60` → 57 ok / 3 rejets gracieux (aucun OAuth) / 0 bug |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Écran config sur une spec OAuth2 → affiche « Automatic connection (OAuth 2.0) », le token endpoint et la note env vars | ⏳ | visuel |
| 2 | Bout-en-bout : uploader une vraie spec OAuth2 client_credentials → générer → self-host → l'agent l'utilise | ⏳ | E2E live |

## Phase upload-url : upload par URL (2026-06-06)

### Tests techniques

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | SSRF : URL http:// → rejetée 400 URL_INVALID | ✓ | `url-fetcher.test.ts` |
| 2 | SSRF : URL pointant vers IP privée → rejetée 400 URL_PRIVATE_IP_BLOCKED | ✓ | `url-fetcher.test.ts` |
| 3 | SSRF via redirect : redirect vers IP privée → bloquée | ✓ | `url-fetcher.test.ts` |
| 4 | Plus de 3 redirects → URL_FETCH_FAILED | ✓ | `url-fetcher.test.ts` |
| 5 | Content-Length > 10 MB → URL_TOO_LARGE 413 | ✓ | `url-fetcher.test.ts` |
| 6 | Timeout 5s → URL_TIMEOUT 504 | ✓ | `upload-url.test.ts` |
| 7 | URL manquante dans body → 400 URL_INVALID | ✓ | `upload-url.test.ts` |
| 8 | URL valide → 200 + `{ parsed, raw }` + rawSpec = texte OpenAPI original | ✓ | `upload-url.test.ts` |
| 9 | Suite complète verte (507) + typecheck | ✓ | |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Cliquer « Paste a URL » → affiche le champ URL + bouton Fetch | ⏳ | visuel |
| 2 | Coller l'URL d'une vraie spec publique (ex. Petstore) → Fetch → passe à l'écran 2 | ⏳ | E2E live |
| 3 | URL http:// → message d'erreur « Only https:// URLs are allowed. » | ⏳ | visuel |
| 4 | URL introuvable / serveur KO → message d'erreur clair | ⏳ | visuel |
| 5 | Générer un MCP depuis une spec chargée par URL → ZIP valide | ⏳ | E2E live |

## Phase fail-loud : rapport de génération (2026-06-06)

### Tests techniques

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| T1 | requestBody multipart → `non_json_body` détecté | ✓ | spec-normalizer.test.ts |
| T2 | requestBody JSON → pas de `non_json_body` | ✓ | spec-normalizer.test.ts |
| T3 | param `in: cookie` → `cookie_param` détecté | ✓ | spec-normalizer.test.ts |
| T4-T6 | oneOf / anyOf / allOf sur param query → `schema_fallback` | ✓ | spec-normalizer.test.ts |
| T7 | type inconnu (`xml`) → `schema_fallback` | ✓ | spec-normalizer.test.ts |
| T8-T9 | endpoint propre → aucune approximation | ✓ | spec-normalizer.test.ts |
| T10 | cumul non_json_body + cookie_param | ✓ | spec-normalizer.test.ts |
| T11 | oneOf sur propriété body flattenée → `schema_fallback` | ✓ | spec-normalizer.test.ts |
| F1-F5 | GenerationReport : compteur, détail, counts, filtre selection | ✓ | config.test.tsx |
| — | Suite complète 523 tests verts + typecheck | ✓ | |

### Tests métier / UX (à valider par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Uploader une spec simple (Petstore) → screen 3 → `N/N endpoints in MCP · All fully supported` visible | ⏳ | visuel |
| 2 | Uploader une spec avec multipart body → sélectionner l'endpoint → ligne ⬜ apparaît | ⏳ | visuel |
| 3 | Uploader une spec avec oneOf (ex. Stripe) → sélectionner → ligne ⚠ apparaît | ⏳ | visuel |
| 4 | Déselectionner l'endpoint approximé → rapport repasse à "All fully supported" | ⏳ | comportement live |
| 5 | Générer le MCP avec approximations → ça fonctionne (rapport n'est qu'informatif) | ⏳ | E2E |
