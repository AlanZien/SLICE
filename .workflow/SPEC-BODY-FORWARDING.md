# SPEC — Forwarding du body de requête

Date : 2026-06-01 (révisée : /advisor + décision Option B « champs étalés »)
Niveau : Complexe (modèle de données partagé + parser + runtime hébergé + kit généré + tests)
Origine : limite révélée en UAT Pivot-4 (écritures et recherche Notion KO faute de body).

## Objectif

Les tools issus d'opérations OpenAPI avec un `requestBody` (POST/PUT/PATCH, ex. `POST /v1/search` de Notion) doivent **exposer le corps de requête à l'agent, champ par champ**, et **le transmettre à l'API amont**, dans le **runtime hébergé** (`/m/:id`) et dans le **kit auto-hébergé** généré.

## Décision de conception : Option B — champs étalés

Chaque propriété de premier niveau du `requestBody` devient un **paramètre du tool à part entière** (avec son nom + sa description), **au même niveau** que les params path/query/header. C'est la forme idiomatique MCP (cf. MCP Notion officiel : `query`, `filter`, `sort` séparés) et c'est **cohérent** avec la façon dont SLICE expose déjà les autres params.

**Modèle unifié retenu** : on étend `EndpointParam` avec la localisation **`in: 'body'`**. Les champs du body deviennent des `EndpointParam` comme les autres → ils traversent **la même machinerie** (schéma d'entrée du tool, routage à l'appel par `p.in`). Un champ de body imbriqué (objet/array) porte un schéma riche via un nouveau `EndpointParam.schema?: ZodSchemaShape`.

## État actuel (constaté dans le code)

- **Parser** (`spec-normalizer.ts:93-103`) : `params = mergeParams(...)`, ne lit pas `op.requestBody`.
- **`EndpointParam.in`** = `'path'|'query'|'header'|'cookie'` (pas `'body'`) ; pas de champ `schema`.
- **Kit** : `http-client.ts.hbs` sait déjà envoyer un body (`body?: unknown` → `JSON.stringify`) ; `mcp-generator.ts` force `hasBody:false`, le template tools ne passe pas de body.
- **Runtime hébergé** : `callUpstream` ne route que `path`/`query`/`header`, n'envoie pas de body.
- **Builders Zod** : `zod-schema-builder.ts` (string) et `buildZodSchema` (runtime) gèrent object/array/properties, **mais incomplets pour du JSON réel** (pas de passthrough, pas de conversion OpenAPI→shape).

## Règles métier (testables)

### Parsing / aplatissement
- **R-B1** — Si une opération a `requestBody.content['application/json'].schema` dont le **top-level est un objet** avec `properties`, le parser **aplatit** : chaque propriété de premier niveau devient un `EndpointParam` avec `in:'body'`, son `name`, `required` (selon le tableau OpenAPI `required: [...]` du body), et — si la propriété est elle-même un objet/array — un `schema: ZodSchemaShape` décrivant sa structure.
- **R-B1.b** — Conversion par une **fonction pure `toZodShape(openApiSchema)`** (récursive) : mappe `type`/`properties`/`items`, traduit `required: string[]`→`requiredFields`, gère `additionalProperties`. C'est elle qui alimente `EndpointParam.schema`.
- **R-B2 (fallback non-objet)** — Si le top-level du body **n'est pas un objet** (array, scalaire) **ou** est un objet **sans `properties` déclarées** (free-form), on n'aplatit pas : un **unique** `EndpointParam` `in:'body'` nommé `body` porte tout le schéma. (`required` = `requestBody.required`.)
- **R-B3 (objets permissifs)** — Tout schéma d'objet (champ de body imbriqué ou fallback `body`) est rendu **permissif** (`.passthrough()` / `record`) : les clés non déclarées **ne sont pas supprimées**. Sans ça, `properties` d'une page Notion (clés dynamiques) et `{}` de recherche seraient vidés. **Critère bloquant du cas nominal.**
- **R-B4 (limites assumées)** — Content-type non-JSON (multipart, octet-stream, form-urlencoded) → pas de body exposé (tool utilisable sans). `enum`/`nullable`/`oneOf`/`anyOf` non modélisés → fallback permissif, tracé BACKLOG. `requestBody` sans schéma exploitable → ignoré.
- **R-B5 ($ref)** — `$ref` internes déjà inlinés par swagger-parser (aucun traitement) ; `$ref` externes déjà bloqués (`assertNoExternalRefs`).

### Exposition dans le tool (kit + hébergé)
- **R-B6** — Le schéma d'entrée du tool liste **tous** les params (path/query/header/body) au **même niveau**. Un param `in:'body'` scalaire est typé depuis `type` ; imbriqué, depuis `schema` (objets permissifs).
- **R-B7 (collision de nom)** — Si un champ de body porte le **même nom** qu'un param path/query/header existant, le param de body est exposé sous la clé `<name>_body` dans le tool, mais **écrit dans le corps sous son vrai nom `<name>`** (mapping conservé). Collision tracée. Aucun écrasement silencieux.
- **R-B8 (parité kit ↔ hébergé, testée)** — Pour un même schéma, l'expression Zod du kit (`buildZodExpression`) et le schéma runtime (`buildZodSchema`) acceptent/rejettent **le même payload** : champ requis manquant → rejet ; clés extra dans un objet permissif → acceptées ; `{}` → accepté.

### Forwarding (runtime hébergé + kit)
- **R-B9** — À l'appel, le corps sortant est **réassemblé** depuis tous les params `in:'body'` fournis (par leur vrai nom amont), puis `body = JSON.stringify(assemblé)`. (Le `Content-Type: application/json` est déjà toujours posé.)
- **R-B10** — Endpoint à body-objet, l'agent ne remplit **aucun** champ de body → corps `{}` envoyé (couvre `POST /v1/search` Notion « tout »). Fallback `body` unique (R-B2) non fourni → **aucun** body envoyé.
- **R-B11** — Le forwarding du body **n'écrase ni** l'`Authorization` relayé **ni** les params `in:'header'`. Les params `in:'body'` ne partent **pas** en query/path.
- **R-B12** — Piloté par la **présence d'un `requestBody`**, pas par la méthode (un GET+body légal est envoyé ; l'amont peut le rejeter — hors responsabilité SLICE). Sans `requestBody` → aucun body, inchangé.
- **R-B13 (erreur)** — Un champ de body **requis** absent de l'appel → **échec validation Zod** : handler non exécuté, **aucune requête amont**.

### Économie de contexte
- **R-B14 (non bloquante)** — Non-régression du compteur pour les endpoints sans body ; pour ceux avec body, la valeur peut augmenter. Pas de cible chiffrée MVP.

## Cas nominal de référence (UAT)
- `POST /v1/search` Notion : tool `search({ query, filter?, sort?, Notion-Version })`. L'agent remplit `query` → corps `{ "query": "…" }` envoyé → résultats. Sans filtre → `{}` → tout.
- Création de page : `create_page({ parent, properties, Notion-Version })`, `properties` = objet permissif à clés dynamiques (vérifie R-B3).

## Cas limites / erreurs
Couverts par les règles : objet libre (R-B3), array top-level (R-B2 fallback), `$ref` interne (R-B5), collision de noms (R-B7), GET+body (R-B12), champ requis manquant (R-B13). Hors MVP : multipart/binaire, `enum`/`nullable`.

## Hors scope (V2)
Content-types non-JSON ; modélisation fine `enum`/`nullable`/`oneOf`/`anyOf` ; aplatissement récursif au-delà du premier niveau (les objets imbriqués restent des args objet permissifs, pas re-étalés).

## Fichiers pressentis (pour REFINE)
- `src/shared/types.ts` — `EndpointParam.in` += `'body'` ; `EndpointParam.schema?: ZodSchemaShape`.
- `src/server/services/zod-schema-builder.ts` — `toZodShape(openApiSchema)` (R-B1.b) ; extension `ZodSchemaShape` (`additionalProperties`) ; objets `.passthrough()`/`record` (R-B3).
- `src/server/services/spec-normalizer.ts` — lit `op.requestBody`, aplatit en params `in:'body'` (R-B1/R-B2), gère collision (R-B7).
- `src/server/services/hosted-mcp-factory.ts` — `buildZodSchema` via `param.schema` pour les body params ; `callUpstream` réassemble + envoie le body (R-B9..13).
- `src/server/services/mcp-generator.ts` — body params dans l'inputSchema (Zod depuis `param.schema`) + `hasBody` réel + `bodyExpr` ; `tools.ts.hbs` passe `body` à `call`.
- `src/server/services/spec-to-hosted-config.ts` — propage les params `in:'body'` + `schema`.
- Tests : `toZodShape`, parser (aplatissement + collision + fallback), **parité kit↔hébergé** (R-B8), mcp-generator (kit assemble + envoie le body), hosted-mcp-factory (R-B9..13 via upstream mock enregistrant le corps reçu), cas Notion-like (`{}` et objet à clés dynamiques transmis intacts).
