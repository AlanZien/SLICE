# Session 2026-05-24 — FIND + BOOTSTRAP

## Phases parcourues

### FIND (terminé et validé)
Brainstorm complet à partir du document `SLICE.md` qui servait de PRD + SPEC consolidé d'entrée. Décisions produit prises :

- **Langage MCP généré** : TypeScript only en MVP, Python en V1.5
- **Transport** : stdio + HTTP Streamable dès le MVP (non négociable pour les use cases Airia/n8n)
- **Auth descendante** (agent → MCP HTTP) : Bearer token via variable d'env
- **Auth amont** (MCP → API externe) : None / API Key / Bearer en MVP. Basic Auth et OAuth2 reportés V1.5.
- **UX** : flow 3 étapes simples, auto-détection depuis OpenAPI, vocabulaire humain ("Voir les produits" plutôt que "GET /products"), options avancées cachées
- **Distribution MVP** : UI web seule, architecture monolithe Express. CLI/SDK/API publique en V1.5+. Refactor API-first quand on ajoute CLI.
- **Modèle économique pressenti** : open core (SLICE gratuit, monétisation via "SLICE Hosted" qui héberge les MCPs)
- **Pas d'IA dans le MVP** (déterministe via swagger-parser + templating Handlebars). IA en option payante envisagée V2+.
- **Positionnement** : UX premium de sélection + dual transport out-of-the-box. Pas de bataille frontale sur le multi-langage (terrain Stainless racheté par Anthropic en mai 2026).

PRD rédigé dans `.workflow/PRD.md`, critiqué par advisor, 4 correctifs appliqués :
1. Retrait de Basic Auth du MVP
2. Architecture monolithe au lieu d'API-first
3. Ajout du compteur de contexte économisé en Must Have
4. Ajout d'une section Sécurité dans Constraints (limites upload, parsing safe, rate limiting)

Délai MVP revu : 7-9 jours (vs 5-7 initial) pour maintenir HTTP dans le MVP.

### BOOTSTRAP (terminé)
- **Git** : initialisé sur `main`, `.gitignore` complet (node_modules, dist, .env, .DS_Store, uploads/, generated/)
- **Stack installée** :
  - Front : React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind CSS v4 + shadcn/ui (new-york, neutral) + react-hook-form + Zod + react-dropzone + lucide-react
  - Back : Express 5 + swagger-parser + handlebars + archiver + express-rate-limit + cors
  - Tests : Vitest + @testing-library/react + jsdom
  - Tooling : pnpm + tsx + concurrently
- **Configs créées** : `vite.config.ts` (proxy `/api` → Express), `vitest.config.ts`, `components.json` (shadcn), 4 tsconfig (root + app + server + node)
- **Structure** : `src/client/` + `src/server/` + `src/shared/` avec aliases `@/*` et `@shared/*`
- **Squelette code** : `App.tsx` page d'accueil "Bootstrap successful", `server/index.ts` Express avec health check + rate limiting (30 req/min/IP)
- **Build front : OK** (190 kB JS / 17 kB CSS gzip)
- **Build back : OK**
- **TypeScript : OK** (0 erreur)
- **Documentation** : `README.md`, `docs/API.md`, `CLAUDE.md` mis à jour avec sections Commandes + Structure + Architecture
- **Repo distant** : `https://github.com/AlanZien/SLICE` (public), pushé sur `main`
- **2 commits initiaux** :
  - `a31038e chore: bootstrap project structure and dependencies`
  - `7a91d08 docs: initial documentation and FORGE workflow setup`
- **Permissions Claude Code** : configurées dans `.claude/settings.local.json` (large allow sur pnpm/git/files/web, deny sur rm/--force/sudo/reset --hard)

## Décisions structurantes du PRD (à respecter dans toutes les phases)
- Pas de DB en MVP, stateless
- Vocabulaire humain dans l'UI (pas de jargon)
- Auto-détection prioritaire sur saisie manuelle
- Sécurité : parsing OpenAPI safe (pas de $ref externes), rate limiting, pas de stockage des specs

## Prochaines étapes

**Pause demandée par Cedric** : il va travailler le design dans Claude Design d'abord pour produire des références visuelles.

À la reprise :
1. Lui demander si les visuels Claude Design sont prêts et où les placer (`.workflow/visuals/` par défaut)
2. Charger `.claude/rules/phases/03-spec.md`
3. Démarrer la phase SPEC :
   - Étape 1 : SPEC fonctionnelle (règles métier chiffrées et testables)
   - Étape 2 : SPEC visuelle (sous-étape 2.1 intégrera les visuels Claude Design)
   - Étape 3 : Parcours utilisateur entre les écrans
   - Étape 4 : Critique advisor
   - Étape 5 : PAUSE pour validation

## Zones grises restantes (à trancher en SPEC)
- OAuth2 amont (flow exact si finalement inclus)
- Stockage temporaire ZIP (mécanisme cleanup après 1h)
- Preview du code généré (front ou backend)
- Déploiement de SLICE lui-même (Vercel/Netlify serverless vs Coolify/VPS)
- Limite upload 10MB (suffisante ?)
- Format .dxt (Desktop Extensions Anthropic) pour éliminer le besoin de Node chez l'user final
- Modèle économique : direction = open core, mais à valider via benchmark concurrents
- Licence du code généré : MIT par défaut ?
- Telemetry produit
- Versionning du template MCP (quand le SDK Anthropic évolue)
