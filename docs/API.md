# SLICE — API Backend

Squelette de l'API REST exposée par le backend Express. À compléter pendant la phase GENERATE de chaque endpoint.

## Base URL

- Développement : `http://localhost:3001`
- Production : même domaine que le front (monolithe)

## Authentification

Aucune en MVP (outil public, stateless, pas de compte utilisateur).

## Rate limiting

- 30 requêtes / minute / IP sur les endpoints `/api/*` sensibles (upload, generate).
- `/api/health` est explicitement **exempté**.
- Headers de réponse : `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

## Endpoints

### GET /api/health

Health check. Aucune authentification. **Exempté du rate-limit** (pour permettre aux monitors / CI / load balancers partagés derrière NAT de probe sans saturer le quota IP).

**Réponse 200**
```json
{
  "ok": true,
  "status": "ok",
  "env": "development",
  "timestamp": "2026-05-25T17:30:00.000Z"
}
```

---

### POST /api/upload

Parse un fichier de spec API et retourne un `ParsedSpec` normalisé.

**Status** : Implémenté.
- Phase 02 : OpenAPI 3.0 / 3.1 natif
- Phase 03 : conversion automatique silencieuse Swagger 2.0 et Postman Collection v2 → OpenAPI 3.0

**Request** : `multipart/form-data`
- `file` (obligatoire) : fichier spec, extensions acceptées `.json`, `.yaml`, `.yml`, taille max **10 Mo strict**

Les autres champs multipart sont ignorés (R1.6.9).

**Formats acceptés (auto-détectés)** :
| Format source | Marker de détection | Pipeline |
|---|---|---|
| OpenAPI 3.0 / 3.1 | `openapi: "3.x"` | passthrough |
| Swagger 2.0 | `swagger: "2.0"` | `swagger2openapi` → OpenAPI 3.0 → parser |
| Postman Collection v2.x | `info.schema` matchant `schema.getpostman.com/json/collection/v2.*` | `postman-to-openapi` → OpenAPI 3.0 → parser |
| Tout autre format (GraphQL SDL, Swagger 1.x, XML, …) | aucun marker reconnu | rejet `UNSUPPORTED_FORMAT` |

**Réponse 200** — `application/json`
```json
{
  "apiName": "Shopify Sample",
  "apiVersion": "2024-04",
  "baseUrl": "https://example.myshopify.com/admin/api/2024-04",
  "authType": "none",
  "groups": [
    {
      "tag": "products",
      "endpoints": [
        {
          "id": "GET /products",
          "method": "GET",
          "path": "/products",
          "label": "List products",
          "params": [
            { "name": "limit", "in": "query", "type": "integer", "required": false }
          ]
        }
      ]
    }
  ]
}
```

**Règles de normalisation (phase 02)**
- Libellés : priorité `summary` > première ligne de `description` > généré (`Lister les <noun>`, `Créer un <noun>`, …) — R1.2.2
- Groupes : par premier tag, sinon `"Autres"` — R1.2.3
- Méthodes : seules `GET / POST / PUT / PATCH / DELETE` sont exposées (HEAD/OPTIONS/TRACE ignorées)
- Path params marqués `required: true` automatiquement (règle OpenAPI)
- `requestBody` non flatten en phase 02 (ajouté en phase 04+)

**Garanties de sécurité**
- Parser YAML safe : `CORE_SCHEMA` (bloque `!!js/function`, `!!binary`, dates, anchors-as-code — R1.1.4)
- `$ref` externes (`http://`, `https://`, `file://`, refs relatifs) rejetés avant validation — anti-SSRF
- Profondeur d'arbre limitée à 50, total nœuds limité à 200 000 — anti-DoS
- Timeout strict 5 s — anti-DoS
- Multer `memoryStorage` ; aucune écriture disque ; buffer relâché en fin de requête

**Codes d'erreur** (JSON `{ "code": "<CODE>", "message": "..." }`)

| HTTP | `code` | Cause |
|------|--------|-------|
| 400 | `NO_FILE` | Champ `file` absent ou mal nommé |
| 415 | `UNSUPPORTED_FORMAT` | Extension hors `.json/.yaml/.yml` |
| 413 | `PAYLOAD_TOO_LARGE` | Fichier > 10 Mo |
| 400 | `INVALID_SPEC` | Input vide / whitespace seul, ou structure OpenAPI invalide post-conversion, ou `$ref` externe |
| 400 | `EMPTY_SPEC` | Pas de `paths` (R1.1.7) |
| 400 | `UNSUPPORTED_VERSION` | OpenAPI 3.2+ (3.0 et 3.1 supportés ; Swagger 2.0 est auto-converti ; Swagger 1.x renvoie `UNSUPPORTED_FORMAT`) |
| 400 | `SWAGGER2_CONVERSION_FAILED` | Conversion Swagger 2.0 → OpenAPI 3.0 a échoué (doc invalide ou structurellement incomplet) |
| 400 | `POSTMAN_CONVERSION_FAILED` | Conversion Postman v2 → OpenAPI 3.0 a échoué (collection invalide ou vide) |
| 400 | `PARSE_DEPTH_EXCEEDED` | Profondeur > 50 ou > 200 000 nœuds |
| 504 | `PARSE_TIMEOUT` | Parsing > 5 s |
| 429 | — | Rate-limit dépassé (30 req/min/IP) |

---

### POST /api/generate

Génère un serveur MCP TypeScript à partir de la sélection d'endpoints + config et **streame** le ZIP directement dans la réponse. Pas d'URL signée, pas de stockage intermédiaire — le bundle est construit en mémoire et expédié immédiatement (R1.4.3, R1.4.6).

**Status** : Implémenté (phase 08).

**Body limit** : 15 Mo (le payload contient le spec complet + la sélection). Dépassement → `413 PAYLOAD_TOO_LARGE`.

**Timeout global** : 30 s. Au-delà → `504 TIMEOUT`.

**Request** : `application/json`
```json
{
  "parsedSpec": { "...": "ParsedSpec issu de /api/upload" },
  "rawSpec": "openapi: \"3.0.3\"\ninfo: { ... }\npaths: { ... }",
  "selectedIds": ["GET /products", "GET /products/{id}"],
  "config": {
    "mcpName": "shopify-mcp",
    "baseUrl": "https://example.myshopify.com/admin/api/2024-04",
    "upstreamAuth": { "type": "apiKey", "headerName": "X-Shopify-Access-Token" },
    "mode": "both",
    "mcpServerToken": "<32 hex chars>",
    "includeParamDescriptions": true,
    "retryOnServerError": false
  }
}
```

**Pourquoi `rawSpec` en plus de `parsedSpec` ?** Le serveur ne fait confiance qu'à son propre parser : il **re-parse** `rawSpec` localement (mêmes garde-fous que `/api/upload` : YAML safe, profondeur, timeout 5 s, refs externes interdits — R1.4.1bis). Les `selectedIds` sont ensuite filtrés contre la liste d'endpoints obtenue (R1.4.1ter). Si aucun ID ne survit → `400 NO_ENDPOINT_SELECTED`.

**Réponse 200** — `application/zip`
- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="<config.mcpName>.zip"`
- Body : flux ZIP contenant les 8 fichiers du bundle MCP (voir `docs/mcp-template.md`)

**Codes d'erreur** — `application/json` `{ "code": "<CODE>", "message": "..." }`

| HTTP | `code` | Cause |
|------|--------|-------|
| 400 | `INVALID_SPEC` | Body Zod invalide, ou re-parse du `rawSpec` a échoué |
| 400 | `NO_ENDPOINT_SELECTED` | Aucun `selectedIds` ne correspond à un endpoint connu après re-parse |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 15 Mo (limite côté Express avant le handler) |
| 500 | `GENERATION_FAILED` | Échec inattendu du moteur Handlebars / archiver |
| 504 | `TIMEOUT` | Pipeline (parse + génération + zip) > 30 s |
| 429 | — | Rate-limit dépassé (30 req/min/IP) |

**Garanties**
- Pas d'écriture disque (archiver `in-memory`, vérifié par test `no-persistence` qui inspecte `os.tmpdir()`)
- Le `parsedSpec` envoyé par le client est utilisé **uniquement** comme guide UI ; toute la chaîne de génération se base sur le re-parse serveur
- Aucune stacktrace en réponse, même en `500`
- p95 < 5 s sur fixture shopify-50 (50 endpoints), < 10 s sur fixture aws-500 (500 endpoints)
