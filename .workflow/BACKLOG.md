# Backlog

Liste append-only des features et idees a developper.
A consulter en fin de DELIVER pour proposer la prochaine feature.

## Features prioritaires

- [ ] {{Premiere idee a developper}}

## Features secondaires

- [ ] {{Idee moins prioritaire mais prevue}}

## Upload par URL (V1.1) — issu de feedback UX 2026-05-27

Actuellement seul le drag&drop / file picker est disponible sur l'écran 1. Beaucoup d'APIs publient leur OpenAPI à une URL bien connue (`https://api.stripe.com/openapi.json`, etc.). Permettre le paste d'URL réduit la friction et colle au positionnement "3 clics".

**Protections SSRF obligatoires** (sinon vulnérabilité critique) :
- [ ] Schémas autorisés : `https://` uniquement (bloquer `file://`, `gopher://`, `ftp://`, `http://`)
- [ ] Bloquer les IPs privées (RFC 1918, loopback, link-local) après résolution DNS — pas seulement sur le hostname (anti DNS rebinding)
- [ ] Timeout strict (5s)
- [ ] Limite de taille 10 Mo (vérifier `Content-Length` + recheck en streaming)
- [ ] Max 3 redirects, chaque hop re-vérifié anti-SSRF
- [ ] User-Agent identifiable : `SLICE/1.0 (+https://slice.dev)`
- [ ] Codes d'erreur dédiés : `URL_INVALID`, `URL_FETCH_FAILED`, `URL_PRIVATE_IP_BLOCKED`, `URL_TIMEOUT`

**UI** :
- [ ] Toggle "Coller une URL / Glisser un fichier" sur l'écran 1
- [ ] Validation côté client : URL `https://` valide avant submit

**Lib recommandée** : `undici` avec custom dispatcher, ou wrapper SSRF-safe écrit maison. NE PAS utiliser `axios` brut.

## MCP multi-API (V1.5+) — issu de réflexion produit 2026-05-27

Aujourd'hui SLICE génère 1 MCP depuis 1 OpenAPI. Postman permet de piocher des endpoints depuis plusieurs APIs publiques et de les bundler dans un seul MCP. Intérêt : workflows agents cross-API (ex : "ops e-commerce" = Stripe + Shopify + Slack), économie de friction de config Claude Desktop, curation par cas d'usage métier plutôt que par éditeur.

- [ ] Upload multiple specs OpenAPI dans une même session
- [ ] Écran de sélection multi-onglets (un onglet par API uploadée)
- [ ] Gestion des conflits de naming entre `operationId` de specs différentes (préfixage par nom d'API)
- [ ] Configuration multi-auth dans l'écran 3 (un bloc credentials par API source)
- [ ] Génération d'un MCP unique avec routing par préfixe de tool
- [ ] Snippets de config Claude Desktop / n8n / Airia adaptés (un seul serveur, plusieurs auths à fournir)
- [ ] UX de "workspace MCP" : sauvegarde côté client de la sélection multi-API pour itérer (sans persistance serveur)

## Robustesse production — issu du corpus check APIs.guru (2026-06-01)

Un harnais (`scripts/corpus-check.ts`) passe N vraies specs d'APIs.guru dans le pipeline. Findings :

- [ ] **PROD-CRITIQUE — OOM parser sur spec valide** : DocuSign (3,13 MB, **sous** la limite 10 MB) fait **OOM (>2 GB)** au déréférencement `$ref` de swagger-parser, **avant** que le timeout 5s / le check de profondeur ne s'activent. Une seule spec uploadée peut **crasher tout le serveur** (DoS). À durcir : parser dans un **worker/process isolé avec cap mémoire** (kill + erreur gracieuse « spec trop complexe »), ou pré-estimer l'explosion `$ref` avant deref. **Bloquant avant une vraie mise en prod multi-tenant.**
- [x] **Couverture OAuth amont (client_credentials) : LIVRÉ** (PR #30/#32/#33/#34, 2026-06-02). Specs oauth2/OIDC acceptées ; flow client_credentials complet self-host (obtention/cache/refresh/retry du token) ; relai en hébergé ; UI config. Corpus : 0 rejet OAuth. Voir `.workflow/phases/oauth/REVIEW.md`. Restant (phases ultérieures) : `authorization_code`/login navigateur ; `client_secret_post` ; basic/digest amont.
- [ ] **OAuth — login navigateur (`authorization_code`)** : couvre les SaaS grand public (Notion/Google/Slack). Nécessite un flux navigateur + gestion refresh_token (token fourni hors-bande au minimum). Plus complexe — phase dédiée. (issu du chantier OAuth)
- [ ] **Dette test/codegen (issu LEARN OAuth)** : 1) factoriser l'infra de banc runtime partagée entre `mcp-generator.relay.test.ts` et `mcp-generator.oauth.test.ts` (freePort/startServer/mocks). 2) Auditer l'échappement maison de la description des tools (`mcp-generator.ts` `.replace(/'/g, ...)`) — même classe de risque que les 2 RCE corrigées, passer à `JSON.stringify` (cf. règle promue `01-conventions.md`).
- [ ] **Levier A — matrice de features OpenAPI** : un test ciblé par construction (oneOf/anyOf/allOf, nullable, enum, $ref circulaire, additionalProperties, formats…) avec verdict *géré/approximé/rejeté*. La version tractable d'« exhaustif ».
- [ ] **Levier C — rapport de génération + fail-loud** : avant déploiement, montrer à l'utilisateur X endpoints supportés / Y approximés (oneOf→string, etc.) / Z ignorés, au lieu de produire un schéma faux en silence.
- [x] **Corpus check en CI/pré-deploy : FAIT** (PR #28, 2026-06-02). `corpus.yml` en `workflow_dispatch` (à la demande, input `sample_size`), hors flux PR (réseau/lent). `corpus-check` sort `exit(1)` sur vrai bug (CRASH/zodfail) via `hasRealBugs`. Pas de nightly à ce stade (scope allégé en accord utilisateur).
- [x] **PROD-CRITIQUE — OOM parser : CORRIGÉ** (phase parser-oom-isolation, D004) — parsing isolé en child_process (timeout-kill + cap mémoire + sémaphore). Voir SPEC-PARSER-OOM.md.
- [ ] **Unifier le contrat d'erreur code→HTTP** (issu EVALUATE/simplify parser-oom) : 3 styles coexistent (`upload.ts` table `STATUS_BY_CODE` ; `reparse-and-select.ts` cascade `if instanceof` qui **renomme** `PARSE_TIMEOUT`→`TIMEOUT` ; `generate/host` via `ApiError.status`). Conséquence : un même « parse timeout » sort `PARSE_TIMEOUT` sur `/upload` mais `TIMEOUT` sur `/generate`+`/host` (le client gère 2 codes). Centraliser `parseErrorToApiError(err)` (un seul `Record<ParseErrorCode,{code,status}>`). + durcissements défense-en-profondeur restants (dépendance rate-limit amont sur /generate+/host à documenter ; aligner `PARSE_MAX_CONCURRENT × maxMemoryMb` < RAM instance).
- [x] **PROD-CRITIQUE — le build prod compilé ne démarre PAS : CORRIGÉ** (PR #26, 2026-06-01). `tsc` + `tsc-alias` (`resolveFullPaths` → extensions `.js` + réécriture `@shared`) via `tsconfig.server.build.json` dédié (exclut les tests). Découverts en cascade en lançant le binaire : route Express 5 `'*'`→`'/{*splat}'`, `clientDist` `../client`→`../../client`, et `typecheck` qui clobbait `dist/server` (fixé via `noEmit`). `parse-child.js` reste sibling spawné OK. Smoke `pnpm prod:smoke` ajouté. Voir `.workflow/phases/fix-prod-build/REVIEW.md`.
- [x] **Câbler `pnpm prod:smoke` en CI pré-release : FAIT** (PR #28, 2026-06-02). Job `gate` de `ci.yml` sur chaque PR + push main : corepack → install --frozen-lockfile → typecheck → test → prod:smoke. A immédiatement attrapé un test non-CI-safe (`mcp-generator.snapshot.test.ts` via `pnpm exec`). Voir `.workflow/phases/ci-pre-release/REVIEW.md`.
- [x] **Figer la version pnpm : FAIT** (PR #28, 2026-06-02). `"packageManager": "pnpm@9.13.2"` + `engines.node >=22` ; corepack activé en CI. Figé sur 9.13.2 (version locale + lockfile réels), pas 10.x.

## Qualification avancée de la spec (V1.1) — issu de réflexion qualité 2026-05-27

Le MVP fait du filtrage léger (3 règles dures, cf. phase 04 tâche 12). La qualification avancée est reportée pour limiter le scope MVP.

- [ ] Intégrer Spectral (linter OpenAPI open source) avec règles custom MCP-oriented
- [ ] Rapport qualité détaillé (✅ utilisable / ⚠️ dégradé / ❌ rejeté) affiché avant l'écran de sélection
- [ ] Détection prompt injection dans les descriptions OpenAPI (patterns "ignore previous instructions", etc.) — surface d'attaque MCP documentée
- [ ] Marquage des endpoints destructifs (DELETE, POST critiques) dans le code MCP généré (warning côté agent)
- [ ] Détection automatique du pattern de pagination (cursor / offset / page) et injection d'un helper dans le MCP
- [ ] Extraction des `x-rate-limit-*` extensions pour exposer les hints côté MCP
- [ ] Support OAuth2 (auth amont MCP → API) — débloque le rejet dur du MVP
- [ ] Support Basic Auth (idem)
- [ ] Validation sémantique : cohérence requestBody/responses, schémas $ref cassés, types inconsistants

## Dette technique & qualité (issu de LEARN Pivot 1-3, 2026-05-31)

- [ ] **Résoudre la dette `mode`/`hosting`** : `mode` est figé à `'remote'` et fait doublon avec `hosting`. Migrer le générateur/snippets vers `hosting`, puis dériver ou supprimer `mode` (deux sources de vérité aujourd'hui). Nettoyer au passage `transportLabelFor` (branches mortes). (issu de Pivot-1)
- [ ] **Batch tests de performance** : les tests perf p95 (R1.1.9 parse < 2s sur shopify-50, R1.2.5 filtre < 100ms sur 500 endpoints, conversions Swagger/Postman < 1s) ont été reportés de phase en phase. À écrire en un batch dédié avant tout claim de perf produit. (issu de LEARN, règle promue dans 03-testing.md)
- [ ] **Décision langue UI (i18n)** : l'UI est en anglais, la SPEC en français ; `'Autres'` hardcodé (phase 02), pas d'accent-folding dans la recherche (phase 04). Trancher EN seul vs bilingue/i18n, puis appliquer. (issu de Pivot-1 + phases 02/04)

## Runtime hébergé — suites Pivot-4 (issu de LEARN Pivot-4, 2026-06-01)

- [x] **Forwarding du body de requête** (`in:'body'`) — LIVRÉ (phase body-forwarding) : parser aplatit `requestBody` en params `in:'body'`, runtime hébergé + kit réassemblent et envoient le corps JSON, objets free-form transmis intacts (passthrough). Débloque écritures + recherche Notion.
- [ ] **Cache du McpServer hébergé** (perf hot path) : `/m/:id` reconstruit tout par requête. Mémoïser par id (LRU), configs immutables. Garder le transport par requête. (issu de Pivot-4, D003 le prévoyait)
- [ ] **Durcissement SSRF anti-DNS-rebinding** : pinner l'IP résolue dans le dispatcher `fetch` (undici) au lieu du `dns.lookup` par appel non-pinné. (issu de Pivot-4 security-review)
- [ ] **Snippet Claude Desktop** : générer un format `supergateway`/`mcp-remote` (fichier de config) pour l'onglet Claude — le bloc `url + headers` brut ne se colle pas dans l'écran connecteur. (issu de Pivot-4, UAT)
- [ ] **Persistance du store hébergé** : `hostedStore` in-memory → URL perdue au restart. KV/DB pour la prod. (issu de Pivot-4)
- [ ] **Parité runtime ↔ kit généré** : aligner le comportement (le runtime forwarde les headers, le template `http-client.ts.hbs` non) + source unique pour la regex/charset du token relayé (dupliquée runtime ↔ `auth-context.ts.hbs`). (issu de Pivot-4 EVALUATE)
- [ ] **`in:'cookie'` géré ou rejeté** explicitement dans `callUpstream` (aujourd'hui dropé silencieusement) + `allowPrivateHosts` en politique d'env unique au lieu de 5 signatures. (issu de Pivot-4 EVALUATE altitude)

## HTML spec-finder — suites (issu de LEARN html-spec-finder, 2026-06-06)

- [ ] **`commonSpecPaths` relatif au chemin de la page** : aujourd'hui sonde toujours à l'origin (`/openapi.json`). Pour `/api/v2/docs`, sonder aussi `/api/v2/openapi.json`. Couvre les APIs versionnées. (issu de EVALUATE altitude)
- [ ] **Regex HTML → HTML parser** : regex fragile sur `<!-- <a href="..."> -->` ou attributs échappés. Tolérable en prod (portails API publics bien formés) mais à surveiller. Si edge cases remontés : ajouter `parse5` ou `cheerio`. (issu de EVALUATE altitude)
- [ ] **Parallélisation candidates** : aujourd'hui séquentielle (simplicité). Si latency signalée en prod sur pages sans lien (→ tente 10 chemins × 5s timeout), passer à `Promise.any()` avec early-return sur premier succès non-HTML. (issu de EVALUATE efficacité)

## Idees a clarifier

- [ ] {{Idee floue qui demande un brainstorm avant de devenir une feature concrete}}

---
Alimente librement par l'utilisateur (ajout d'idees, reorganisation).
Cochee automatiquement par FORGE en phase DELIVER quand une feature est livree.
