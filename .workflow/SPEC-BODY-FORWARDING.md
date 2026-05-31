# SPEC — Forwarding du body de requête

Date : 2026-06-01 (révisée après critique /advisor)
Niveau : Complexe (modèle de données partagé + parser + runtime hébergé + kit généré + tests)
Origine : limite révélée en UAT Pivot-4 (écritures et recherche Notion KO faute de body).

## Objectif

Les tools issus d'opérations OpenAPI avec un `requestBody` (POST/PUT/PATCH, ex. `POST /v1/search` de Notion) doivent **exposer le corps de requête à l'agent** et **le transmettre à l'API amont**, à la fois dans le **runtime hébergé** (`/m/:id`) et dans le **kit auto-hébergé** généré. Aujourd'hui le `requestBody` est ignoré de bout en bout.

## État actuel (constaté dans le code)

- **Parser** (`spec-normalizer.ts`) : ne lit pas `op.requestBody`. `Endpoint` n'a aucun champ body.
- **Kit généré** : `http-client.ts.hbs` **sait déjà** envoyer un body (`body?: unknown` → `JSON.stringify`), mais `mcp-generator.ts` force `hasBody: false` et le template des tools ne passe jamais de body.
- **Runtime hébergé** : `callUpstream` fait `fetch(url, { method, headers })` — **aucun body** (le `Content-Type: application/json` est, lui, déjà toujours posé).
- **Builders Zod** : `zod-schema-builder.ts` (kit, string) et `buildZodSchema` (runtime) gèrent `object`/`array`/`properties`/`requiredFields`, **mais ces branches n'ont jamais tourné en prod** et sont **incomplètes pour du JSON réel** (cf. décision ci-dessous).

## Décision de conception (à valider — PAUSE)

**Comment exposer le body comme entrée du tool ? → Option A : un seul argument `body`.**

Le tool gagne un param `body`, typé en Zod depuis le schéma du `requestBody`. Zéro collision avec path/query/header, schéma imbriqué visible par l'agent, forwarding query inchangé. (Option B « aplatir les propriétés » = reportée V2 : collisions de noms + objets imbriqués lourds.)

**⚠ Coût réel d'Option A (corrigé après /advisor)** : la réutilisation des builders Zod n'est **pas gratuite**. Deux prérequis durs :

1. **Une fonction de conversion `toZodShape(openApiSchema)`** (récursive) qui mappe un schéma OpenAPI (`{ type, properties, required: [...], items, additionalProperties, nullable, enum }`) vers `ZodSchemaShape`. Elle n'existe nulle part. C'est elle qui traduit le tableau OpenAPI `required: string[]` en `requiredFields`, et qui gère récursivement objets/arrays imbriqués.
2. **Les objets doivent être `.passthrough()` (ou `z.record`)**, sinon `z.object({...})` **strippe les clés non déclarées** → le cas nominal Notion (`POST /v1/search` avec `{ query }`, création de page avec `properties` à clés dynamiques) **renvoie un body vidé**. C'est le piège central : sans passthrough, Option A est **inutilisable sur son propre cas de référence**.

## Règles métier (testables)

### Parsing
- **R-B1** — Si une opération a un `requestBody.content['application/json'].schema`, le parser attache à l'`Endpoint` un `requestBody: { required: boolean; schema: ZodSchemaShape }`. Le schéma est déjà déréférencé par swagger-parser (les `$ref` **internes** sont inlinés au parse ; les externes restent bloqués par `assertNoExternalRefs`).
- **R-B1.b** — La conversion OpenAPI→`ZodSchemaShape` est faite par une **fonction pure `toZodShape(schema)`** : mappe `type`/`properties`/`items`, traduit `required: string[]` (OpenAPI) en `requiredFields`, récursivement. Couvre object, array, array d'objets, scalaires. Cas non mappés (cf. R-B3) → fallback documenté.
- **R-B2** — `required` reflète `op.requestBody.required === true` (défaut `false`).
- **R-B3 (limites de typage assumées)** — `additionalProperties` / objet sans `properties` → l'objet est rendu **permissif** (`passthrough`/`record`) et non strippant. `enum`, `nullable` non modélisés en MVP → fallback (champ accepté en `string`/permissif), tracé en BACKLOG. Content-type non-JSON (multipart, octet-stream, form-urlencoded) → **pas** de body exposé (le tool reste utilisable sans body). Si `application/json` coexiste, on le prend.
- **R-B4** — `requestBody` sans `content`, sans schéma, ou schéma vide → ignoré (pas de champ `requestBody`, comme R-B3 non-JSON).

### Exposition dans le tool (kit + hébergé)
- **R-B5** — Quand l'`Endpoint` a un `requestBody`, le schéma d'entrée du tool gagne une clé `body`, typée via `toZodShape` + builder. `body` est **requis** ssi `requestBody.required === true`, sinon `.optional()`. Les objets sont permissifs (R-B3).
- **R-B6 (parité runtime ↔ kit, testée)** — Pour un même schéma de body, l'**expression string** générée pour le kit (`buildZodExpression`) et le **schéma runtime** (`buildZodSchema`) doivent **accepter/rejeter le même payload** : objet `{}`, objet avec clés extra (doit passer, R-B3), champ requis manquant (doit échouer). Un test de parité dédié garde l'invariant « même MCP des deux côtés » (dette Pivot-4 non rouverte).
- **R-B7 (désambiguïsation de clé)** — Si l'endpoint a déjà un param (query/header/path/cookie) **nommé `body`**, la clé du corps devient `requestBody` (pas d'écrasement silencieux). Sinon, `body`.

### Forwarding (runtime hébergé + kit)
- **R-B8** — À l'appel d'un tool avec un body fourni : la requête sortante porte **`body = JSON.stringify(args[bodyKey])`**. (Le `Content-Type: application/json` est déjà toujours posé — ce n'est donc pas le critère discriminant ; le critère testé est la présence/valeur du `body` sortant.)
- **R-B9** — body absent/`undefined` (cas optionnel non rempli) → **aucun** `body` envoyé (pas de `"undefined"`).
- **R-B10** — body objet **vide `{}`** explicitement fourni → transmis tel quel (`"{}"`), pour couvrir `POST /v1/search` Notion sans filtre.
- **R-B11** — Le forwarding du body **n'écrase ni** l'`Authorization` relayé **ni** les params `in:'header'`.
- **R-B12** — Forwarding piloté par la **présence d'un `requestBody` dans la spec**, pas par la méthode. Un GET/DELETE qui déclare un `requestBody` (légal, rare) expose et envoie le body (l'amont peut le rejeter — hors responsabilité SLICE, tracé). Une opération sans `requestBody` → aucun body, comportement inchangé.
- **R-B13 (cas d'erreur)** — body marqué **requis** et **absent** de l'appel → l'invocation **échoue en validation Zod** : le handler n'est pas exécuté, **aucune requête amont émise**.

### Économie de contexte
- **R-B14 (non bloquante, best-effort)** — Non-régression : le compteur d'économie ne change pas pour les endpoints sans body. Pour ceux avec body, la valeur peut augmenter (le schéma de body ajoute des tokens). Pas de cible chiffrée en MVP.

## Cas nominal de référence (UAT)
`POST /v1/search` Notion via le MCP hébergé : l'agent passe `body: { query: "…" }` (+ `Notion-Version` en header) → l'amont reçoit le corps JSON, renvoie les résultats. Création de page : `body` = `{ parent, properties }`, où `properties` est un **objet à clés dynamiques** (vérifie le passthrough R-B3).

## Cas limites / erreurs
- `additionalProperties` / objet libre → permissif (R-B3). **Sans ce point, le cas nominal échoue.**
- `type: array` au top-level du body → `body` est un array, forwardé tel quel (testé).
- `$ref` interne dans le schéma → déjà inliné par swagger-parser, aucun traitement spécial.
- `$ref` externe → déjà bloqué (`assertNoExternalRefs`).
- body requis non fourni → R-B13 (échec validation, pas d'appel amont).
- Schéma profond/cyclique → borné par les limites de parsing existantes.
- Multipart / binaire / form-urlencoded, `enum`, `nullable` → non supportés MVP, tracés BACKLOG.

## Hors scope
- Aplatissement des propriétés du body (Option B) — V2.
- Content-types non-JSON — V2.
- Modélisation fine `enum`/`nullable`/`oneOf`/`anyOf` — V2.

## Fichiers pressentis (pour REFINE)
- `src/shared/types.ts` — `Endpoint.requestBody?: { required: boolean; schema: ZodSchemaShape }`.
- `src/server/services/zod-schema-builder.ts` — **extension `ZodSchemaShape`** (`additionalProperties`) + objets `.passthrough()`/`record` ; nouvelle fonction **`toZodShape(openApiSchema)`** (R-B1.b).
- `src/server/services/spec-normalizer.ts` — capture `op.requestBody` → `toZodShape` → `requestBody`.
- `src/server/services/hosted-mcp-factory.ts` — `buildZodSchema` aligné sur le passthrough ; ajoute la clé body au shape ; `callUpstream` envoie le body.
- `src/server/services/mcp-generator.ts` — `hasBody` réel + clé body dans l'inputSchema + `bodyExpr` ; template `tools.ts.hbs` passe `body` à `call`.
- `src/server/services/spec-to-hosted-config.ts` — propage `requestBody` dans `HostedMcpConfig`.
- Tests : `toZodShape` (mapping + récursif), parser (R-B1..4), **parité builder kit↔runtime** (R-B6), mcp-generator (kit envoie le body), hosted-mcp-factory (R-B8..13 via upstream mock qui enregistre le body reçu), cas nominal Notion-like (`{}` et objet à clés dynamiques transmis intacts).
