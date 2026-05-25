# SLICE — Curated MCP Servers for AI Agents

Générateur web de serveurs MCP (Model Context Protocol) sur-mesure depuis une spec OpenAPI.

## Phase en cours

**REFINE validé (2026-05-25)** — SPEC complète dans `.workflow/SPEC.md`, 13 PLAN.md dans `.workflow/phases/0X-*/PLAN.md`, matrice couverture dans `.workflow/phases/COVERAGE.md`. Décision D001 (Handlebars) dans `.workflow/DECISIONS.md`.

**Prochaine étape : BOOTSTRAP + GENERATE phase 01 (squelette)**

Reprise après /compact :
1. **BOOTSTRAP** (3 étapes restantes du workflow) :
   - Étape 1 : `git init` + premier commit `chore: initial commit`
   - Étape 3 : `/permissions` (autoriser `Bash(pnpm:*)`, `Bash(npx:*)`, `Bash(git:*)` lecture, etc.)
   - Étape 6 : créer le repo distant GitHub (`gh repo create slice --private --source=. --remote=origin`) + premier push `main` (seul push sur main autorisé)
2. **GENERATE phase 01** : suivre `.workflow/phases/01-skeleton/PLAN.md` en TDD strict (RED → GREEN → REFACTOR par tâche, commits atomiques, branche `feature/01-skeleton`)

Reste à faire après phase 01 : phases 02 → 13 selon `.workflow/phases/COVERAGE.md`.

## Stack

### Frontend
- **React 18+** avec **Vite** (build rapide, HMR)
- **TypeScript** (strict mode)
- **Tailwind CSS** (styling, prérequis shadcn)
- **shadcn/ui** (composants UI — copiés dans le repo, basés sur Radix UI)
- **react-dropzone** (upload de fichiers)
- **Zod** (validation des formulaires)
- **Lucide React** (icônes, livré nativement avec shadcn)
- **react-hook-form** (gestion des formulaires, recommandé avec shadcn + Zod)

### Backend
- **Node.js** (LTS) + **TypeScript** (strict mode)
- **Express** (framework HTTP, monolithe qui sert front statique + API)
- **swagger-parser** (parsing OpenAPI safe)
- **handlebars** (templating du code généré — décision D001)
- **swagger2openapi** (conversion auto Swagger 2.0 → OpenAPI 3.0)
- **postman-to-openapi** (conversion auto Postman Collection v2 → OpenAPI 3.0)
- **archiver** (création des ZIP)
- **express-rate-limit** (protection upload/generate)

### Code MCP généré
- **@modelcontextprotocol/sdk** (SDK Node officiel)
- **zod** (validation des inputs des tools)
- Transports supportés : **stdio** (Claude Desktop, Cursor, Windsurf) + **HTTP Streamable** (n8n, Airia)

### Tests
- **Vitest** (unit + integration)
- Tests E2E à arbitrer en SPEC si nécessaires

### Build & deploy
- **pnpm** (package manager)
- Déploiement : à trancher en SPEC (Vercel/Netlify serverless vs Coolify/VPS)

## Decisions (issues du PRD FIND validé)

### Produit
- **MVP = UI web seule**. Pas de CLI, SDK ou API publique au lancement. Roadmap V1.5+.
- **3 étapes maximum** dans le flux utilisateur (upload → sélection → configuration + génération).
- **Vocabulaire humain obligatoire** dans l'UI (pas de jargon technique visible). Tooltips pour les power users.
- **Auto-détection prioritaire** : tout ce qui peut être deviné depuis la spec OpenAPI (nom, URL de base, type d'auth) doit l'être.

### Technique
- **Langage du MCP généré : TypeScript only en MVP**. Python prévu en V1.5.
- **Transports : stdio + HTTP Streamable** dès le MVP (non négociable, Airia/n8n l'exigent).
- **Auth descendante (agent → MCP HTTP)** : Bearer token simple via variable d'env `MCP_SERVER_TOKEN`.
- **Auth amont (MCP → API)** : None / API Key / Bearer en MVP. Basic Auth et OAuth2 reportés en V1.5.
- **Architecture monolithe Express** en MVP (sert front + API). Refactor API-first en V1.5.
- **Pas de base de données**. Stateless, stockage éphémère uniquement.
- **Compteur de contexte économisé** affiché dans l'UI (sert de critère de succès mesurable + argument visible).

### Sécurité
- Limite upload stricte 10MB
- Parsing OpenAPI safe (pas de `$ref` externes, timeout 5s, limite de profondeur)
- Parser YAML safe (pas d'évaluation de tags arbitraires)
- Rate limiting `/api/upload` et `/api/generate` (30 req/min/IP)
- Pas de stockage des specs uploadées au-delà de la génération
- Pas d'exécution de code depuis la spec

### Business
- **Modèle économique pressenti : open core**. SLICE gratuit pour générer + télécharger. Monétisation via offre "SLICE Hosted" (héberge les MCPs générés pour l'utilisateur). À valider en SPEC.
- **Pas de moteur IA dans le MVP**. IA en option payante envisagée en V2+ (suggestion d'endpoints, amélioration de descriptions).

### Positionnement marché
- UX premium de sélection + dual transport (stdio + HTTP) out-of-the-box + pensé pour workflows agents cloud (n8n, Airia).
- Pas de bataille frontale sur le multi-langage (terrain Stainless racheté par Anthropic en mai 2026).

## Commandes

```bash
# Développement (front + back en parallèle)
pnpm dev

# Front seul (Vite, port 5173)
pnpm dev:client

# Back seul (Express, port 3001)
pnpm dev:server

# Build de production
pnpm build              # front + back
pnpm build:client       # front seul
pnpm build:server       # back seul

# Production (après build)
pnpm start

# Tests
pnpm test               # une fois
pnpm test:watch         # mode watch
pnpm test:ui            # interface graphique

# TypeScript check
pnpm typecheck

# Ajouter un composant shadcn
pnpm dlx shadcn@latest add <component>
```

## Structure

```
SLICE/
├── src/
│   ├── client/              # Frontend React
│   │   ├── components/ui/   # Composants shadcn/ui
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utils (cn pour shadcn)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css        # Tailwind v4 + thème shadcn
│   │   ├── test-setup.ts    # Setup Vitest
│   │   └── vite-env.d.ts    # Types Vite + déclarations CSS
│   ├── server/              # Backend Express
│   │   ├── routes/          # Route handlers (upload, generate)
│   │   ├── services/        # Logique métier (parser, generator)
│   │   ├── templates/       # Templates Handlebars (code MCP généré)
│   │   └── index.ts         # Entrée serveur Express
│   └── shared/              # Code partagé front/back (types, schémas Zod)
├── public/                  # Assets statiques
├── docs/                    # Documentation interne (API.md)
├── .workflow/               # Workflow FORGE (PRD, SPEC, phases, etc.)
│   └── visuals/             # Références visuelles fournies en SPEC
├── dist/                    # Output de build (gitignored)
│   ├── client/              # Build front
│   └── server/              # Build back
├── components.json          # Config shadcn/ui
├── vite.config.ts           # Config Vite (front)
├── vitest.config.ts         # Config Vitest (tests)
├── tsconfig.json            # Config TS racine (références)
├── tsconfig.app.json        # Config TS client
├── tsconfig.server.json     # Config TS server
├── tsconfig.node.json       # Config TS pour vite.config.ts
├── index.html               # Entry HTML Vite
├── package.json
└── pnpm-lock.yaml
```

## Architecture

- **Monolithe Express** : un seul serveur qui sert le front statique (en prod) et expose l'API
- **En dev** : Vite (port 5173) + Express (port 3001) en parallèle, proxy Vite `/api/*` → Express
- **En prod** : Express sert `dist/client/` + ses propres routes `/api/*`
- **Aliases TypeScript** : `@/*` → `src/client/*`, `@shared/*` → `src/shared/*`

## Liens utiles

- Spec produit complète : [SLICE.md](SLICE.md)
- PRD validé : [.workflow/PRD.md](.workflow/PRD.md)
- Workflow FORGE : `.claude/rules/`
