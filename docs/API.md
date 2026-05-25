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

Parse une spec OpenAPI uploadée et retourne la liste des endpoints détectés.

**Status** : À implémenter (phase GENERATE)

**Request** : `multipart/form-data`
- `file` : fichier OpenAPI (JSON ou YAML, max 10MB)

**Réponse 200**
```json
{
  "success": true,
  "spec": {
    "title": "Shopify API",
    "version": "2024-01",
    "baseUrl": "https://api.shopify.com",
    "detectedAuth": "bearer",
    "endpoints": [
      {
        "id": "search_products",
        "path": "/products/search",
        "method": "GET",
        "summary": "Voir les produits",
        "description": "Search products by query",
        "tag": "Products",
        "parameters": [
          { "name": "query", "in": "query", "type": "string", "required": true }
        ]
      }
    ]
  }
}
```

**Erreurs**
- `400` : fichier manquant, format invalide, spec OpenAPI mal formée
- `413` : fichier > 10MB
- `429` : rate limit atteint

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
