# PRD : SLICE — Curated MCP Servers for AI Agents

Date : 2026-05-24
Statut : DRAFT

## Problem Statement

Quand un développeur ou un consultant IA veut connecter une API à un agent (Claude Desktop, Cursor, n8n, Airia, agent custom), il a deux galères :

1. **Si un MCP existe** (Stripe, Shopify, Slack...) : il expose 50+ endpoints d'un coup. L'agent est noyé dans le choix, le contexte est pollué, et il y a un risque réel qu'il appelle des endpoints dangereux (créer un paiement au lieu d'en lire un).

2. **Si l'API est custom** (backend maison, API client) : aucun MCP n'existe, il faut coder un serveur MCP à la main (3-4h par projet, à refaire pour chaque client).

**Le marché actuel** est en cours de fragmentation :
- **Postman MCP Generator** : limité à son réseau d'APIs partenaires
- **openapi-mcp-generator** : CLI uniquement, pas d'UI
- **convertmcp.com / Stainless** (racheté par Anthropic en mai 2026) : multi-langages mais livrent du code source brut, peu pensé pour des utilisateurs non-tech

**Pourquoi maintenant :** l'adoption MCP explose (10 SDK officiels Anthropic, intégration dans n8n et Airia depuis 2025-2026), mais aucun outil ne combine UX premium de sélection fine + support natif des workflows agents cloud.

## Target Users

### Primary — Consultant IA / Freelance (profil Cedric)
- Construit des agents IA pour clients (consulting)
- Stack : Windsurf + Claude Code pour le dev, Airia cloud + n8n self-hosted pour les agents
- Pain : génère 5-10 MCPs par mois pour des clients aux APIs variées, veut un setup rapide sans coder
- Niveau : "un peu tech" — comprend les concepts mais déteste le jargon

### Secondary — Développeur d'app custom
- Bâtit son propre backend, veut exposer 4-5 endpoints à un agent IA
- Pain : "Je n'ai besoin que de quelques endpoints, pas tous les 30"
- Veut une solution rapide, pas de code à écrire

### Tertiary — Agence d'automatisation
- Bâtit des solutions d'automation pour SMBs
- Pain : chaque client a des APIs différentes, besoin de scalabilité sans dev effort
- Souvent users de n8n / Make / Airia

## Success Criteria

- [ ] **Upload + parsing < 2s** sur une spec OpenAPI de 50 endpoints (référence : Shopify, ~25 endpoints)
- [ ] **Génération + download < 5s** après clic sur "Générer"
- [ ] **MCP généré fonctionne sans modification** : `npm install && node index.js` démarre le serveur sans erreur
- [ ] **MCP connectable en < 1 min** dans Claude Desktop, n8n et Airia (juste coller URL ou config)
- [ ] **Réduction de contexte mesurable de 60%+** vs. exposer tous les endpoints d'une spec (mesure : nombre de tokens dans la déclaration des tools MCP)
- [ ] **Time-to-MCP < 5 min** : depuis la spec uploadée jusqu'à un agent qui appelle les endpoints sélectionnés

## Requirements

### Must Have (MVP)

**Upload & parsing**
- Upload OpenAPI JSON ou YAML (max 10MB) par drag-and-drop ou file picker
- Parsing automatique de la spec
- Affichage de la liste des endpoints avec libellés humains (extraits des descriptions OpenAPI)
- Gestion d'erreur claire si spec invalide

**Sélection des endpoints**
- Liste d'endpoints avec cases à cocher, libellés humains ("Voir les produits" plutôt que `GET /products`)
- Groupement par tag/catégorie
- Boutons bulk : "Tout cocher les lectures (GET)", "Tout cocher les écritures", "Tout décocher"
- Barre de recherche
- Compteur d'endpoints sélectionnés

**Configuration auto-détectée + éditable**
SLICE détecte depuis la spec OpenAPI et pré-remplit :
- Nom du serveur (depuis `info.title`)
- URL de base (depuis `servers[0].url`)
- Type d'authentification amont (depuis `securitySchemes`)

L'utilisateur peut éditer chaque champ si la détection est imparfaite.

**Choix du mode d'utilisation (1 question simple)**
- "Sur mon ordi" (Claude Desktop, Cursor, Windsurf, Claude Code...) → transport stdio
- "Sur un serveur en ligne" (n8n, Airia, Zapier...) → transport HTTP Streamable
- "Les deux" → MCP supportant les 2 transports

**Auth amont (MCP → API externe)**
- Aucune
- Clé API (header configurable)
- Bearer token
- ~~Basic Auth (login + mot de passe)~~ → reporté en V1.5 (rare en API moderne)
- ~~OAuth2~~ → reporté en V1.5

**Auth descendante (agent → MCP en mode HTTP)**
- Bearer token simple, défini via variable d'env `MCP_SERVER_TOKEN`

**Génération & téléchargement**
- Bouton "Générer mon MCP"
- Indicateur de progression
- Téléchargement d'un ZIP contenant :
  - Code complet du serveur MCP (TypeScript, `src/index.ts`)
  - `package.json` avec dépendances figées (`@modelcontextprotocol/sdk`, etc.)
  - `.env.example` avec les variables d'auth nécessaires
  - `README.md` avec instructions pas-à-pas (installation, démarrage, connexion à Claude Desktop / n8n / Airia)
  - `tsconfig.json`
  - `.gitignore`

**Page de succès post-génération**
- Récap "Ton MCP est prêt"
- 3 étapes pour l'utiliser (téléchargement → édition .env → connexion à l'agent)
- Snippet de config prêt à copier pour Claude Desktop
- URL exemple pour n8n / Airia

**Compteur de contexte économisé**
Affichage dans l'UI du nombre de tokens estimés pour la déclaration des MCP tools, AVANT et APRÈS sélection ("Tu économises 73% de contexte vs. exposer toute l'API"). Sert à la fois de critère de succès mesurable et d'argument visible pour l'utilisateur.

**Architecture monolithe simple**
Backend Express qui sert à la fois le front (assets statiques) et 2 endpoints (`POST /api/upload`, `POST /api/generate`). Pas de séparation front/back déployée séparément en V1. Refactor en archi API-first en V1.5 quand on ajoute CLI/SDK.

### Should Have

- Toggle "Options avancées" qui dévoile : token de sécurité HTTP, descriptions détaillées des paramètres, configuration manuelle de l'auth amont si auto-détection foire
- Preview du code généré dans un onglet (lecture seule)
- Preview de la liste des MCP tools qui seront exposés
- Responsive design (desktop prioritaire, tablette OK)

### Could Have (post-MVP V1.5)

- Génération en **Python** (template additionnel)
- **CLI** (`npm install -g @slice/cli`) pour automatisation et CI/CD
- Refactor en **archi API-first** (front et back déployés séparément, prépare CLI/SDK/API publique)
- Support **Basic Auth** amont (login + mot de passe)
- Support **OAuth2** amont (flow simplifié, client credentials)
- Bouton "Deploy en un clic" vers Vercel / Railway
- Validation de la spec OpenAPI avant parsing (feedback plus précis sur les erreurs)

### Could Have (V2+)

- **API publique** officielle + documentation (permet aux partenaires d'intégrer)
- **SDK** TypeScript et Python officiels
- Génération en **Go**
- Offre **marque blanche** payante (B2B)
- Historique / favoris (nécessiterait une DB)
- Bibliothèque publique de specs pré-configurées (Stripe, Slack, Shopify...)
- Interface de test : appeler les endpoints directement depuis SLICE

### Won't Have (this version)

- **Pas de base de données.** SLICE MVP est stateless. Les uploads et ZIPs sont temporaires (cleanup automatique après 1h).
- **Pas de compte utilisateur.** Pas de login, pas de profil, pas de persistance entre sessions.
- **Pas de génération multi-langage.** TypeScript uniquement en MVP. Why : maintenir 1 template au lieu de 2-N, shipper plus vite. Stainless couvre déjà ce terrain.
- **Pas d'éditeur de code intégré.** Preview en lecture seule uniquement.
- **Pas de collaboration ou de partage** (équipes, commentaires sur spec, etc.).

## Constraints

### Techniques
- **Stack imposée :** TypeScript partout (front + back + code généré). Cohérence et capitalisation des templates.
- **UI : shadcn/ui + Tailwind CSS** (composants copiés dans le repo, customisables, basés sur Radix UI pour l'accessibilité)
- **MCP généré doit fonctionner avec le SDK officiel** `@modelcontextprotocol/sdk` (Node.js).
- **Transports MCP supportés dans le MVP :** stdio (Claude Desktop, Cursor) ET HTTP Streamable (n8n, Airia). SSE legacy non prioritaire mais le SDK le gère nativement.
- **Auto-détection auth depuis OpenAPI :** SLICE parse `securitySchemes` pour pré-remplir le formulaire. Si absent ou mal formaté, fallback sur sélection manuelle.

### Produit / UX
- **Vocabulaire humain obligatoire.** Pas de jargon technique côté UI (pas de "stdio", "Bearer", "endpoint"). Tooltips pour les power users qui veulent le détail technique.
- **Maximum 3 étapes visibles** dans le flux principal (upload → sélection → configuration + génération).
- **Auto-détection prioritaire sur saisie manuelle.** Tout ce qui peut être deviné depuis la spec doit l'être.

### Délai / scope
- MVP livré en **7-9 jours de dev** une fois la SPEC technique validée (estimation revue après critique advisor : maintien de HTTP dans le MVP justifie le délai supplémentaire vs. estimation initiale 5-7 jours).
- Pas de réinvention : utiliser des libs éprouvées (`swagger-parser`, `handlebars`, `archiver`).

### Sécurité (le backend SLICE parse du contenu uploadé par l'utilisateur)
- **Limite de taille upload stricte** : 10MB max, refus immédiat au-delà
- **Parsing OpenAPI safe** : désactivation des `$ref` externes (pas de fetch HTTP depuis le parser), timeout de parsing 5s, limite de profondeur des objets
- **Protection contre les bombes YAML/JSON** : utiliser un parser YAML safe (pas d'évaluation de tags arbitraires), refus des fichiers à structure pathologique
- **Rate limiting basique** sur `/api/upload` et `/api/generate` (ex : 30 req/min/IP) pour éviter l'abus
- **Pas de stockage des specs uploadées** au-delà du temps de génération (suppression immédiate après création du ZIP)
- **Pas d'exécution de code** depuis la spec uploadée (génération purement textuelle via templating)

## Open Questions (à trancher en SPEC, pas en FIND)

- [ ] **Stockage temporaire ZIP :** mécanisme de cleanup (cron, TTL filesystem, in-memory) et limite de taille totale
- [ ] **Preview du code généré :** rendu côté front (génération en double dans le navigateur) ou côté backend (appel API supplémentaire) ?
- [ ] **Déploiement de SLICE lui-même :** Vercel/Netlify (serverless, simple) vs Coolify/VPS (serveur persistant, plus de contrôle) — impacte l'architecture du backend
- [ ] **Limite upload 10MB :** suffisante pour 95% des specs ? À vérifier (Stripe OpenAPI ~5MB, AWS dépasse fréquemment)
- [ ] **Format `.dxt` (Desktop Extensions Anthropic) :** faisabilité d'une export en .dxt en plus du ZIP, pour éliminer le besoin d'avoir Node installé chez l'utilisateur final
- [ ] **Modèle économique :** direction pressentie = **open core** (SLICE gratuit pour génération + download, monétisation via offre "SLICE Hosted" qui héberge les MCPs générés pour l'utilisateur). À valider en SPEC après benchmark concurrents (Stainless cloud, ConvertMCP pricing). Autres modèles à garder ouverts : freemium par quota, licence commerciale pour agences, features Pro (Python/Go/OAuth2). L'IA reste un add-on futur possible mais pas le levier principal.
- [ ] **Licence du code généré :** MIT par défaut ? Permettre à l'utilisateur de choisir ? Important si les users revendent à leurs clients
- [ ] **Telemetry / analytics produit :** comment mesurer l'usage réel sans nuire à la promesse "pas de données stockées" ? (compteur anonyme côté serveur ? Plausible / Umami ?)
- [ ] **Versionning du template MCP :** stratégie quand `@modelcontextprotocol/sdk` évolue (les anciens ZIPs deviennent obsolètes — on documente ? On notifie ? On régénère ?)

## Décisions structurantes (à reporter dans CLAUDE.md projet)

- **Stack :** TypeScript / React / Vite (front) + Node.js / Express / TypeScript (back) + `@modelcontextprotocol/sdk` (code généré)
- **Architecture :** API-first, stateless, sans DB en MVP
- **Templating code généré :** Handlebars ou Eta (à arbitrer en ORIENT si nécessaire)
- **Parser OpenAPI :** `swagger-parser`
- **Packaging ZIP :** `archiver`
- **Positionnement marché :** UX premium de sélection + dual transport (stdio + HTTP) out-of-the-box + pensé pour workflows agents cloud (n8n, Airia). Pas de bataille frontale sur le multi-langage (terrain Stainless).

---
Généré par le workflow FORGE (phase FIND). À valider par l'utilisateur avant de passer à BOOTSTRAP.
