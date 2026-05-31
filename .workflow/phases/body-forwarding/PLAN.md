# Plan : Forwarding du body de requête

Date : 2026-06-01 (révisé après /advisor)
SPEC : `.workflow/SPEC-BODY-FORWARDING.md` (Option B — champs étalés via params `in:'body'`)
Niveau : Complexe — 1 phase cohérente (~7 fichiers ; feature indivisible). Garde-fou : T2+T3 (builders) verts avant d'attaquer T4-T8.
Statut : EN ATTENTE DE VALIDATION (REFINE)

## Objectif

Aplatir le `requestBody` JSON en paramètres de tool (`in:'body'`), les exposer comme champs séparés (kit + hébergé), et **réassembler + envoyer le corps** à l'API amont. Débloque écritures + recherche Notion.

## Couverture SPEC → tâches (chaque règle : nominal + négatif)

| Règle | Tâche | Test (nominal / négatif) |
|-------|-------|------|
| R-B1 aplatissement objet | T4 | props top-level → params `in:'body'` / objet sans props → fallback |
| R-B1.b `toZodShape` | T3 | object/array/required→requiredFields/additionalProperties / non-objet |
| R-B2 fallback `body` unique | T3+T4 | array/scalaire/objet-free-form → 1 param `body` |
| R-B3 objets permissifs | T2 | clés extra conservées, `{}` accepté / non-objet rejeté |
| R-B4 limites (non-JSON ignoré) | T4 | multipart → 0 param body / (oneOf/anyOf → **HORS SCOPE V2**, voir bas) |
| R-B5 `$ref` interne inliné | T4 | body avec `$ref` interne → schéma résolu |
| R-B6 tool liste params à plat + descriptions | T5,T7 | inputSchema hébergé+kit contient les body fields + leur `description` |
| R-B7 collision de nom (`wireName`) | T1,T4,T5,T6 | clé `<name>_body` exposée / vrai nom sur le wire |
| R-B8 parité kit ↔ hébergé | T2/T8 | même payload accepté/rejeté (méthode : voir T2) |
| R-B9 réassemblage + JSON.stringify | T5,T6 | upstream mock reçoit le corps JSON attendu |
| R-B10 `{}` envoyé / fallback omis | T5,T6 | étalé sans champ → `{}` / fallback absent → pas de body |
| R-B11 pas d'écrasement auth/header, body ≠ query | T5 | Authorization+header intacts, body fields absents de l'URL |
| R-B12 piloté par requestBody (GET+body) | T4,T5 | requestBody présent → body / **GET sans requestBody → aucun body (non-régression)** |
| R-B13 champ requis manquant → pas d'appel | T5 | validation Zod échoue, upstream non appelé |
| R-B14 tokens non-régression | T4 | endpoint sans body : compteur inchangé |

## Fichiers impactés

- [ ] `src/shared/types.ts` — `EndpointParam.in` += `'body'` ; `EndpointParam.schema?: ZodSchemaShape` ; **`EndpointParam.wireName?: string`** (nom amont réel quand la clé exposée est désambiguïsée — R-B7).
- [ ] `src/server/services/zod-schema-builder.ts` — `toZodShape()` + extension `ZodSchemaShape` (`additionalProperties`) + objets `.passthrough()` (string `buildZodExpression`).
- [ ] `src/server/services/spec-normalizer.ts` — lit `op.requestBody`, aplatit (+`description` des props), collision→`wireName`, fallback.
- [ ] `src/server/services/hosted-mcp-factory.ts` — sélecteur `buildZodSchema` (body→`param.schema`) ; `callUpstream` réassemble + envoie le body.
- [ ] `src/server/services/mcp-generator.ts` — body params dans l'inputSchema (via `param.schema`) + `hasBody`/`bodyFallback` + `bodyExpr` (quoting via helpers existants).
- [ ] `src/server/templates/tools.ts.hbs` — branche étalé `body: { {{bodyExpr}} }` vs fallback `body: {{access 'body'}}`.
- [ ] `src/server/services/spec-to-hosted-config.ts` — propagation (copie déjà `params` ; test de garde + `description`/`wireName` survivent).

## Tâches (ordre TDD, dépendances respectées)

- [ ] **T1 — Modèle** : `EndpointParam.in += 'body'` + `schema?: ZodSchemaShape` + **`wireName?: string`**. Type-only (pas de test propre), débloque le reste.
- [ ] **T2 — Builders permissifs + parité** : étendre `ZodSchemaShape` (`additionalProperties`), objets `.passthrough()` dans `buildZodExpression` (string) **et** `buildZodSchema` (runtime). **3 sous-cas canoniques** : object+props, object sans props (free-form), additionalProperties.
  - **Méthode de parité (tranché, option légère)** : la parité *comportementale* est prouvée **côté runtime** (`buildZodSchema` → `.safeParse` sur un tableau accepted/rejected partagé) ; côté string, **snapshot** de l'expression + le smoke `tsx`/`tsc` de T6 garantit que le bundle compile et envoie le bon corps. Pas d'éval de la string.
  - RED : test runtime — `{a (req), b}` + clés extra → accepte `{a,b,extra}`, rejette `{}` (a requis), accepte `{}` si rien requis, **rejette un scalaire** pour un champ objet. **Le `ZodSchemaShape` d'entrée est un littéral écrit dans le test** (pas de dépendance à `toZodShape`/T3).
- [ ] **T3 — `toZodShape(openApiSchema)`** : fonction pure de conversion.
  - RED : object→properties+requiredFields ; array→items ; scalaire ; `additionalProperties` ; objet sans props → shape permissive ; non-objet top-level → marqueur fallback.
- [ ] **T4 — Parser aplatit le body** : `spec-normalizer` lit `op.requestBody.content['application/json'].schema`, `toZodShape`, aplatit les props top-level en params `in:'body'` (name + **description de la prop** + required selon `required:[]` + `schema` si imbriqué) (R-B1) ; fallback `body` unique si non-objet/free-form (R-B2) ; ignore non-JSON (R-B4) ; `$ref` interne déjà résolu (R-B5) ; collision avec un param existant → clé exposée `<name>_body` + **`wireName=<name>`** (R-B7).
  - RED : `POST /search` body `{query, filter}` → 2 params `in:'body'` (+description) ; body array → 1 param `body` ; content `multipart` → 0 param body ; collision `query` (query+body) → param body `name:query_body, wireName:query` ; **GET sans requestBody → aucun param body** (R-B12/R-B14).
- [ ] **T5 — Runtime hébergé envoie le body** :
  - **(a)** Remplacer `shape[p.name] = buildZodSchema(shapeOfParam(p))` par un **sélecteur** : `p.in==='body' && p.schema ? buildZodSchema(p.schema) : buildZodSchema(shapeOfParam(p))`. (B1)
  - **(b)** `callUpstream` réassemble le corps depuis les params `in:'body'` : clé tool = `p.name`, **nom amont = `p.wireName ?? p.name`** → `{ [wireName]: args[p.name] }`. **Décision du corps sortant (R-B10)** : s'il existe ≥1 param body étalé → toujours envoyer l'objet (même `{}`) ; si fallback unique `body` et `args.body===undefined` → **pas** de body. `body = JSON.stringify(...)`, sans toucher auth/header/query.
  - **Pré-requis harnais (B2)** : étendre le mock upstream des tests pour **bufferiser le corps** (`req.on('data')/('end')` → `body: JSON.parse(raw)`).
  - RED (mock méthode+headers+**corps**) : `search {query:"x"}` → corps `{"query":"x"}` ; sans champ → `{}` (R-B10) ; champ requis manquant → upstream **non appelé** (R-B13) ; Authorization+`Notion-Version` intacts, body fields absents de l'URL (R-B11) ; collision → `query` (vrai nom) sur le wire (R-B7) ; **GET sans body → fetch sans corps** (non-régression, les tests relay GET existants restent verts).
- [ ] **T6 — Kit généré envoie le body** :
  - `mcp-generator` : body params dans l'inputSchema (Zod string via `param.schema` quand imbriqué) ; `hasBody` réel + flag **`bodyFallback`** ; `bodyExpr` réassemble avec **`formatPropertyKey(wireName)`** (clé) + **`formatArgsAccess(exposedKey)`** (valeur) — comme `queryExpr`.
  - `tools.ts.hbs` : `{{#if hasBody}}{{#if bodyFallback}}body: {{access body}}{{else}}body: { {{bodyExpr}} }{{/if}}{{/if}}`.
  - RED : tool généré pour `POST /search` → inputSchema contient `query`/`filter`, passe `body: { "query": args["query"] }` ; champ hyphené `parent-id` → quoting correct ; **smoke runtime `tsx`** (pattern `mcp-generator.relay.test.ts` + mock bufferisant le corps) : appel → upstream reçoit le bon corps.
- [ ] **T7 — Cas Notion-like hébergé (E2E)** : `{}` et un objet à **clés dynamiques** (`properties`) transmis **intacts** (R-B3) ; couvre R-B6 (descriptions exposées).
- [ ] **T8 — Propagation config hébergée** : test de garde `spec-to-hosted-config` — les params `in:'body'` + `schema` + `wireName` + `description` arrivent dans `HostedMcpConfig`.

## Tests E2E
T7 (Notion-like hébergé) + smoke runtime kit T6 via `tsx`. Pas de dépendance Docker.

## HORS SCOPE (tracé, V2)
`oneOf`/`anyOf`/`enum`/`nullable` (fallback permissif non garanti) ; content-types non-JSON ; aplatissement récursif au-delà du 1er niveau (objets imbriqués = args objet permissifs).

## UAT (DELIVER)
Régénérer le MCP Notion hébergé, brancher dans Claude Desktop, demander une **recherche** → résultats réels (trou Pivot-4 fermé).

## Definition of Done
- [ ] T1–T8 cochées, tests TDD verts (parité kit↔hébergé + cas Notion-like).
- [ ] `pnpm typecheck` clean, suite verte.
- [ ] EVALUATE **STANDARD** (pas de chemin auth/secret nouveau ; le body = donnée non-sensible, le relai existe déjà) : `/simplify`.
- [ ] PR sur `feature/request-body-forwarding`, UAT.md + RETRO mis à jour.
