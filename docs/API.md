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
- Profondeur d'arbre limitée à 20, total nœuds limité à 200 000 — anti-DoS
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
| 400 | `PARSE_DEPTH_EXCEEDED` | Profondeur > 20 ou > 200 000 nœuds |
| 504 | `PARSE_TIMEOUT` | Parsing > 5 s |
| 429 | — | Rate-limit dépassé (30 req/min/IP) |

---

### POST /api/generate

Génère un serveur MCP TypeScript à partir de la sélection d'endpoints et du config, retourne un ZIP téléchargeable.

**Status** : À implémenter (phase GENERATE)

**Request** : `application/json`
```json
{
  "selectedEndpointIds": ["search_products", "get_product"],
  "config": {
    "serverName": "shopify-mcp",
    "baseUrl": "https://api.shopify.com",
    "authType": "bearer",
    "transport": "both",
    "includeDescriptions": true
  }
}
```

**Réponse 200**
```json
{
  "success": true,
  "downloadUrl": "/downloads/shopify-mcp-abc123.zip",
  "expiresIn": 3600,
  "contextTokens": {
    "fullSpec": 12450,
    "selectedOnly": 3210,
    "savedPercent": 74
  }
}
```

**Erreurs**
- `400` : config invalide, endpoints sélectionnés introuvables
- `429` : rate limit atteint
- `500` : erreur de génération

---

### GET /downloads/:filename

Téléchargement direct du ZIP généré. URL signée avec TTL (1h). Aucune authentification (URL non devinable).

**Status** : À implémenter (phase GENERATE)

**Réponse 200** : fichier ZIP binaire (`Content-Type: application/zip`)

**Erreurs**
- `404` : fichier expiré ou inexistant
