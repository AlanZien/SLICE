# Spec Produit : SLICE - Curated MCP Servers for AI Agents

## 1. Résumé Exécutif

**Nom du Produit :** SLICE

**Tagline :** Curated MCP servers for AI agents

**Pitch :** Générateur de serveur MCP (Model Context Protocol) à partir d'une spec API (OpenAPI/Swagger). Permet de sélectionner les endpoints spécifiques à exposer à un agent IA, réduisant le context window et améliorant l'efficacité.

**Value Proposition :**
- Transformer une spec API complète en MCP server contenant SEULEMENT les endpoints sélectionnés
- Réduire le context window de 60-80% (vs. exposer tous les endpoints)
- Améliorer la sécurité (empêcher les actions dangereuses via whitelist)
- One-click génération + download (pas de code à écrire)

---

## 2. Problem Statement

### Problème Actuel
Quand un développeur veut connecter une API à un agent IA :

**Scenario A :** API publique (Stripe, Shopify, Slack)
- MCP existant expose TOUS les endpoints (50+ pour Stripe, 25 pour Shopify)
- Agent IA confus par le choix massif
- Context window pollué
- Hallucinations : agent essaie d'appeler des endpoints dangereux (ex: créer un paiement au lieu de lire)

**Scenario B :** API custom/privée
- Doit coder un MCP server à la main (3-4h de dev)
- Répétitif si plusieurs APIs

### Solutions Existantes & Gaps
- **Postman MCP Generator** : ✅ Sélection UI, ❌ Limité aux APIs publiques du réseau Postman
- **openapi-mcp-generator** (CLI) : ✅ Fonctionne, ❌ Pas de sélection UI, juste CLI/config
- **convertmcp.com** : ✅ Web-based, ❌ Génère tous les endpoints par défaut

**Gap à couvrir :** UI fluide de sélection d'endpoints pour n'importe quelle API (publique, privée, custom).

---

## 3. User Personas

### 1. Développeur d'App (Primary)
- **Cedric** : Bâtit une app custom avec backend, veut connecter ses endpoints à un agent IA
- Pain point : "Je n'ai besoin que de 4-5 endpoints, pas tous les 30"
- Comportement : Veut une solution rapide, pas de code

### 2. Consultant/Freelance IA
- **Sophie** : Développe des agents IA custom pour clients
- Pain point : Doit générer 10+ MCPs par mois, chacun unique
- Comportement : Veut optimiser le temps de setup par client

### 3. Agence d'Automation
- **Martin** : Bâtit des solutions d'automation pour SMBs
- Pain point : Chaque client a des APIs différentes, besoin de setup rapide
- Comportement : Cherche à scalabiliser sans dev effort

---

## 4. MVP Scope

### 4.1 Core Features

#### Feature 1 : Upload & Parse API Spec
- [ ] Upload fichier OpenAPI JSON/YAML (max 10MB)
- [ ] Parse automatiquement la spec
- [ ] Extraire et afficher la liste des endpoints (path + method + description)
- [ ] Gestion d'erreur : spec invalide → message clair

#### Feature 2 : Sélection des Endpoints
- [ ] Afficher arborescence des endpoints (groupés par tag/path)
- [ ] Checkboxes pour sélectionner/désélectionner endpoints
- [ ] Boutons bulk : "Select All Reads (GET)", "Select All Writes", "Clear All"
- [ ] Recherche/filtre par endpoint name (cmd+K ou search box)
- [ ] Visualisation du nombre d'endpoints sélectionnés

#### Feature 3 : Configuration du MCP
- [ ] Nom du serveur MCP
- [ ] Sélection du langage : TypeScript ou Python
- [ ] URL de base de l'API (autofill depuis spec si dispo)
- [ ] Type d'authentification :
  - [ ] None
  - [ ] API Key (header name configurable)
  - [ ] Bearer Token
  - [ ] Basic Auth
  - [ ] OAuth2 (simplified)
- [ ] Optional : descriptions détaillées des parameters (toggle on/off)

#### Feature 4 : Génération & Download
- [ ] Bouton "Generate MCP Server"
- [ ] Loader/progress indication
- [ ] Download ZIP contenant :
  - [ ] Complète MCP server code (index.ts ou main.py)
  - [ ] package.json / requirements.txt
  - [ ] .env.example avec vars d'auth
  - [ ] README.md avec instructions
  - [ ] tsconfig.json / pyproject.toml si applicable

#### Feature 5 : Prévisualisation
- [ ] Onglet "Preview" → aperçu du code généré
- [ ] Onglet "Tools" → liste des MCP tools qui seront exposés

---

## 5. User Journey (Happy Path)

```
1. Developer accède à l'app
   → Voit bouton "Upload API Spec"

2. Upload openapi.json (ex: Shopify)
   → Spec parsée, 25 endpoints affichés dans UI

3. Clique "Select All Reads"
   → 15 endpoints (GET) sélectionnés

4. Déselectionne endpoints non-pertinents (ex: graphql_mutation)
   → 12 endpoints finaux

5. Configure :
   - Server name : "shopify-mcp"
   - Language : "typescript"
   - Auth : "Bearer Token"
   - Base URL : "https://shopify.api.com"

6. Clique "Generate MCP Server"
   → ZIP téléchargé

7. Dézippe, renomme .env.example → .env, rentre token
   → node src/index.js (le MCP démarre)

8. Connecte au Claude Desktop via claude_desktop_config.json
   → Agent peut appeler les 12 endpoints sélectionnés
```

---

## 6. Tech Stack Recommandé

### Frontend
- **React** (Vite) pour rapidité
- **TypeScript** pour type safety
- **Tailwind CSS** pour styling (minimaliste, pragmatique)
- **React-dropzone** pour upload
- **Zod** pour validation du formulaire
- **Lucide React** pour icones

### Backend / Logic
- **Node.js** + **TypeScript** 
- **Fast-check** ou **joi** pour validation
- **swagger-parser** pour parser OpenAPI specs
- **handlebars** ou **eta** pour templating du code généré

### Build & Deploy
- **Vite** pour build
- **pnpm** pour package management
- Optional : self-hosted (Coolify) ou Vercel/Netlify

### Generated MCP Server Code
- **@modelcontextprotocol/sdk** (Node.js SDK)
- **axios** ou **node-fetch** pour HTTP calls
- **zod** pour validation des inputs

---

## 7. Architecture High-Level

```
┌─────────────────────────────────────────────────────┐
│                Frontend (React)                      │
├─────────────────────────────────────────────────────┤
│  - Upload zone                                       │
│  - Endpoint selector (checkboxes, arbo)             │
│  - Configuration form (auth, language, etc.)        │
│  - Preview panel                                     │
│  - Download button                                   │
└──────────────┬──────────────────────────────────────┘
               │ API calls
               ↓
┌─────────────────────────────────────────────────────┐
│              Backend (Node.js/Express)              │
├─────────────────────────────────────────────────────┤
│  POST /api/upload                                    │
│    → Validate + parse OpenAPI spec                  │
│    → Return list of endpoints (JSON)                │
│                                                      │
│  POST /api/generate                                 │
│    → Input: selectedEndpoints, config, language    │
│    → Generate MCP server code                       │
│    → Create ZIP file                                │
│    → Return download link                           │
│                                                      │
│  Core Logic:                                         │
│    - OpenAPI Parser (swagger-parser)                │
│    - Code Generator (Handlebars templates)          │
│    - ZIP creator (archiver)                         │
└──────────────┬──────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────┐
│        Generated Output (ZIP structure)             │
├─────────────────────────────────────────────────────┤
│  my-mcp-server/                                      │
│  ├── src/                                            │
│  │   └── index.ts (main MCP server)                 │
│  ├── package.json                                    │
│  ├── tsconfig.json                                   │
│  ├── .env.example                                    │
│  ├── README.md                                       │
│  └── .gitignore                                      │
└─────────────────────────────────────────────────────┘
```

---

## 8. API Endpoints (Backend)

### POST /api/upload
**Request:**
```json
{
  "file": (multipart binary)
}
```

**Response:**
```json
{
  "success": true,
  "spec": {
    "title": "Shopify API",
    "version": "2024-01",
    "endpoints": [
      {
        "id": "search_products",
        "path": "/products/search",
        "method": "GET",
        "description": "Search products",
        "parameters": [
          { "name": "query", "type": "string", "required": true }
        ]
      },
      ...
    ]
  }
}
```

### POST /api/generate
**Request:**
```json
{
  "selectedEndpointIds": ["search_products", "get_product"],
  "config": {
    "serverName": "shopify-mcp",
    "language": "typescript",
    "baseUrl": "https://shopify.api.com",
    "authType": "bearer",
    "includeDescriptions": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "downloadUrl": "/downloads/shopify-mcp-1234.zip",
  "expiresIn": 3600
}
```

---

## 9. Code Generation Templates

### TypeScript MCP Server Template
```typescript
// Generated code will include:
// 1. MCP Server initialization
// 2. Tool definitions for each selected endpoint
// 3. Request handler (with auth, validation)
// 4. Error handling
// 5. Environment variable injection

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "shopify-slice",
  version: "1.0.0",
});

// Tool: search_products
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "search_products") {
    const { query } = request.params.arguments;
    
    const response = await fetch(
      `${process.env.API_BASE_URL}/products/search?query=${query}`,
      {
        headers: {
          "Authorization": `Bearer ${process.env.API_TOKEN}`,
        },
      }
    );
    
    return {
      content: [{ type: "text", text: JSON.stringify(await response.json()) }],
    };
  }
});

// ... more tools
```

---

## 10. Database (if needed at all)

**MVP : No database** (stateless, file-based generation)
- File uploads temporary (cleanup après 1h)
- Generated ZIPs stored temporarily
- Future : Could add history/favorites with DB

---

## 11. UI/UX Flow (Wireframe Description)

```
┌─────────────────────────────────────────────────────────────┐
│ SLICE — Curated MCP Servers                   [Home]        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1 : Upload OpenAPI Spec                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Drag & drop] or [Click to select]                   │  │
│  │ Supports: JSON, YAML, .openapi.json                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Step 2 : Select Endpoints                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Search...]                    [Select All Reads] [X] │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ☑ GET /products               (search_products)      │  │
│  │ ☑ GET /products/:id           (get_product)          │  │
│  │ ☐ POST /products              (create_product)       │  │
│  │ ☐ PUT /products/:id           (update_product)       │  │
│  │ ☑ GET /orders                 (list_orders)          │  │
│  │ ☑ GET /orders/:id             (get_order)            │  │
│  │ ☐ POST /discounts             (create_discount)      │  │
│  │                                                        │  │
│  │ Selected: 4/25 endpoints                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Step 3 : Configure                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Server Name: [shopify-slice        ]                 │  │
│  │ Language:    [TypeScript ▼]                          │  │
│  │ Base URL:    [https://shopify.api.com ]              │  │
│  │ Auth Type:   [Bearer Token ▼]                        │  │
│  │ Include param descriptions: [✓]                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Preview Code] [Generate & Download]                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Definition of Done (MVP)

### Backend
- [ ] POST /api/upload : Parse OpenAPI, return endpoint list
- [ ] POST /api/generate : Generate TypeScript MCP server code
- [ ] Error handling & validation
- [ ] Unit tests (core logic)

### Frontend
- [ ] Upload component
- [ ] Endpoint selector with search
- [ ] Configuration form
- [ ] Download link generation
- [ ] Responsive design

### Generated Code
- [ ] Valid MCP server that starts without errors
- [ ] All selected endpoints callable via MCP tools
- [ ] Auth headers configured correctly
- [ ] README avec instructions claires

### Documentation
- [ ] README projet (install, usage)
- [ ] Example : "Generate MCP for Shopify"
- [ ] Troubleshooting guide

---

## 13. Success Criteria

1. **User can upload an OpenAPI spec** → Parsed correctly in <2s
2. **User can select/deselect endpoints** → 50 endpoints, deselect 30, select works
3. **Generated MCP server runs** → `node index.js` → no errors
4. **Agent can call endpoints** → Claude Desktop connects, calls work
5. **Context reduction** → Verify context tokens reduced 60%+ vs. full spec
6. **Time to market** → Setup + generate takes <5 min from spec to working agent

---

## 14. Future Enhancements (Post-MVP)

- [ ] Python + Go code generation targets
- [ ] Direct GitHub commit (push generated code to repo)
- [ ] One-click deploy to Coolify
- [ ] Collaborative spec editing (teams)
- [ ] Public library of pre-configured specs (Stripe, Slack, etc.)
- [ ] Version history + rollback
- [ ] API key rotation helper
- [ ] Testing interface (call endpoints directly)

---

## 15. Dev Checklist (For Claude Code)

### Phase 1: Backend (Day 1)
- [ ] Setup Express server + TypeScript
- [ ] Implement OpenAPI parser (swagger-parser)
- [ ] Create code generator with templates
- [ ] Build /api/upload & /api/generate endpoints
- [ ] Error handling

### Phase 2: Frontend (Day 1-2)
- [ ] React + Vite setup
- [ ] Upload component
- [ ] Endpoint selector UI
- [ ] Configuration form
- [ ] Download trigger

### Phase 3: Integration & Testing (Day 2)
- [ ] Wire frontend ↔ backend
- [ ] Test with real OpenAPI specs (Shopify, Stripe JSON)
- [ ] Verify generated MCP works
- [ ] Edge case handling

### Phase 4: Polish (Day 3)
- [ ] UX improvements
- [ ] Error messages
- [ ] Documentation

---

## 16. Example Workflows

### Example 1 : Generate MCP for Custom API with SLICE
```
Input : openapi.json (your backend)
Selected : [GET /users, GET /deals, POST /deals]
Output : slice-custom-api.zip
        → Can call these 3 endpoints via MCP
        → Ready to connect to Claude Desktop
```

### Example 2 : SLICE Shopify for Read-Only Access
```
Input : shopify-api.json (25 endpoints)
Selected : [GET /products, GET /orders, GET /customers]
Output : slice-shopify-read.zip
        → Agent can only read, not modify
        → Context -88% vs. full Shopify MCP
        → Safe and focused
```

---

## 17. Non-Functional Requirements

- **Performance :** Upload parse <2s, generate <5s
- **Security :** No API keys stored server-side, env vars only
- **Scalability :** Stateless design, can handle 1000+ users
- **Browser Support :** Chrome, Firefox, Safari (modern versions)
- **File size :** Generated ZIP <1MB
