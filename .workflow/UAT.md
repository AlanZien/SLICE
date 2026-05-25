# Cahier de recette

## Phase 01 : Squelette back + front + theming (2026-05-25)

### Tests techniques (générés par Claude depuis PLAN 01)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | `pnpm test` → 20/20 verts (4 fichiers de tests) | ✓ | useTheme, Stepper, Topbar, /api/health |
| 2 | `pnpm typecheck` → exit 0 | ✓ | tsc -b strict mode |
| 3 | `pnpm build` → produit `dist/client/` et `dist/server/` | ✓ | front 197 KB / 62 KB gzipped |
| 4 | `pnpm dev` lance front (5173) et back (3001) en parallèle | ✓ | concurrently |
| 5 | `curl http://localhost:3001/api/health` retourne `{"ok":true,"status":"ok",...}` | ✓ | exempté du rate-limit |

### Tests métier / UX (validés par l'utilisateur)

| # | Scenario | Résultat | Notes |
|---|----------|----------|-------|
| 1 | Topbar affiche wordmark SLICE + breadcrumb `/new` + stepper étape 1 + ⌘K + Recommencer | ✓ | screenshot validé |
| 2 | "Curated MCP servers for AI agents" affiché en Fraunces italic, centré | ✓ | |
| 3 | Boutons dev `Étape 1/2/3/4` font basculer le stepper et le breadcrumb | ✓ | |
| 4 | Étape 2 → breadcrumb `/shopify-admin-api` | ✓ | |
| 5 | Toggle thème dark ↔ light met à jour palette, icône change | ✓ | |
| 6 | Thème persiste après F5 (localStorage) | ✓ | |
| 7 | Click "Recommencer" → revient à Étape 1, breadcrumb `/new` | ✓ | |
| 8 | Grille de points subtile visible sur le fond | ✓ | |

### Observations

- L'utilisateur a testé en light mode (probablement toggle déjà effectué). Dark par défaut au premier chargement avec localStorage vide (vérifié via test useTheme).
- Boutons dev shortcuts présents pour permettre la preview des écrans futurs. Gated `import.meta.env.DEV` → strippés en prod build.
- 6 findings "à considérer" loggés dans `.workflow/RETRO.md` pour LEARN (CORS, body limit, inline script, pattern `cn()`, padding topbar, couverture tests).

**Date d'execution :** 2026-05-25
**Version testée :** branche `feature/01-skeleton`

---
Ce fichier s'accumule au fil des features.
L'utilisateur fait sa recette quand il le souhaite — ce n'est PAS une etape bloquante du pipeline.
Genere par le workflow FORGE (phase DELIVER).
