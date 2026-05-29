# SLICE — Curated MCP Servers for AI Agents

Générateur web de serveurs MCP (Model Context Protocol) sur-mesure depuis une spec OpenAPI.

## Phase en cours

**Pivot stratégique en cours (2026-05-29)** — Le modèle "binaire double-clic" (phases 11/12 explorées sur `feature/11-standalone-binary`) est **abandonné** après validation de l'impossibilité Gatekeeper (signature Apple obligatoire, notarisation per-request inviable pour MVP). Nouveau modèle : **SLICE Cloud + self-host PaaS/Docker**, livrable = URL + snippet à coller dans l'agent.

**Phases mergées sur main** : 01 → 10 (PR #1-13), hotfix #14 (useDownload idempotent).

**En cours** :
- **PR #15** ouverte : `fix: quote hyphenated param names in generated tools.ts` (hotfix universellement utile, extrait de la branche binaire abandonnée)
- **Branche `feature/11-standalone-binary` parkée sur origin** comme exploration archivée (binaire Bun + détection OS + hotfix hyphenated). À ne pas merger. Contient les PLAN.md 11-standalone-binary et 12-claude-desktop-connector qui ne s'appliquent plus.

**Prochaine étape** : **Phase SPEC pour "SLICE Cloud (MVP)"** (workflow FORGE) — cadrer l'architecture hébergée :
- Où héberger (Cloudflare Workers, Fly.io, Railway, VPS managé) ?
- Auth model : MVP anonyme (URL = secret) puis comptes pour facturation/dashboard
- Secrets utilisateur : **JAMAIS stockés côté SLICE** — transmis par le client (Claude/n8n/etc.) à chaque requête dans un header, le MCP-hébergé relaie
- Snippet généré contient `url:` + `headers: { Authorization: Bearer <token-user> }`
- Self-host track : bouton "Deploy to Railway/Render/Fly.io" + bundle Docker (pas de ZIP source nu)

**Flow utilisateur cible (validé)** :
1. Upload spec → 2. Sélection endpoints → 3. Config (sans token) → 4. Choix d'hébergement (SLICE Cloud / PaaS one-click / Docker bundle) → 5. URL + snippet renvoyés → 6. Utilisateur colle dans Claude/n8n + remplace `COLLE_TON_TOKEN_ICI`

**État technique** :
- 371 tests verts sur main, typecheck strict clean (avant PR #15)
- Phase 10 livre actuellement un ZIP source — **à remplacer** par le double bouton "Deploy to SLICE Cloud" / "Self-host (Docker)" dans la prochaine phase
- ConnectionTabs existant à refondre : snippets passent tous en mode URL + header (le mode stdio local disparaît du parcours nominal)
- `/api/generate` (route ZIP) à déprécier après bascule
- Le mode HTTP transport déjà implémenté dans le générateur MCP est exactement ce qu'il faut pour l'hébergement

**Reprise** :
1. `git pull --ff-only` pour resynchroniser main
2. Vérifier que PR #15 est mergée (hotfix hyphenated-params)
3. Lancer **phase SPEC** (`.claude/rules/phases/03-spec.md`) pour cadrer SLICE Cloud :
   - SPEC fonctionnelle (le flow validé ci-dessus + cas d'erreur)
   - Décisions techniques : hébergement, auth MVP, secrets, déploiement PaaS, packaging Docker
   - Mise à jour `.workflow/PRD.md` / `.workflow/DECISIONS.md` avec le pivot
4. Puis REFINE pour découper en phases exécutables

**Anciens jalons (toujours pertinents post-launch, à re-prioriser)** : `.workflow/phases/11-security-backend/`, `12-a11y-responsive/`, `13-polish-docs/` — gardés tels quels sur main car non liés au pivot.

Détails sessions précédentes : `.workflow/sessions/`.

Roadmap globale : `.workflow/phases/COVERAGE.md` (à mettre à jour pendant la phase SPEC).
Positionnement marché : `.workflow/POSITIONING.md` (Speakeasy = concurrent #1, différenciateur = UX non-tech).
Détails sessions précédentes : `.workflow/sessions/`.

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
