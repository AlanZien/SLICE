# Plan : Phase 01 — Squelette back + front + theming

Date : 2026-05-25
SPEC : .workflow/SPEC.md (Principe de conception, design tokens 2.1)
Statut : DRAFT

## Objectif

Mettre en place le squelette technique du projet (Vite/React/Tailwind/shadcn côté front, Express côté back), avec topbar + stepper + theming dark/light fonctionnels, prêts à accueillir les écrans des phases suivantes.

## Fichiers impactes

- [ ] `package.json` — déps front+back + scripts `dev`, `build`, `start`, `test`, `typecheck`
- [ ] `vite.config.ts` — config Vite, proxy `/api/*` vers `localhost:3001`, alias `@/`, `@shared/`
- [ ] `vitest.config.ts` — config Vitest (jsdom env pour front, node pour back)
- [ ] `tsconfig.json`, `tsconfig.app.json`, `tsconfig.server.json`, `tsconfig.node.json` — refs TS strictes
- [ ] `tailwind.config.ts` + `src/client/index.css` — Tailwind v4 + tokens design system (variables CSS extraits de `slice-hifi.css`)
- [ ] `components.json` — config shadcn/ui style "new-york", base neutral
- [ ] `index.html` — entry HTML
- [ ] `src/client/main.tsx`, `src/client/App.tsx` — bootstrap React
- [ ] `src/client/components/topbar.tsx` — wordmark + breadcrumb + stepper + ⌘K hint + Recommencer
- [ ] `src/client/components/stepper.tsx` — pill stepper réutilisable
- [ ] `src/client/hooks/use-theme.ts` — toggle dark/light persistant en localStorage
- [ ] `src/client/lib/utils.ts` — `cn()` shadcn
- [ ] `src/server/index.ts` — boot Express + health check `GET /api/health`
- [ ] `src/shared/types.ts` — types partagés (placeholder pour `ParsedSpec`, `SliceConfig`)
- [ ] `.eslintrc.json`, `.prettierrc` — lint + formatage
- [ ] `.gitignore` — node_modules, dist, .env

## Taches

- [ ] 1. `pnpm init` + install des deps front (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss@4`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`)
- [ ] 2. Install deps back (`express`, `cors`, `helmet`, `morgan`, `@types/express`)
- [ ] 3. Install tooling (`typescript`, `vitest`, `@testing-library/react`, `jsdom`, `tsx`, `concurrently`, `eslint`, `prettier`)
- [ ] 4. Configurer Vite + Express en parallèle (`pnpm dev` lance les deux via `concurrently`)
- [ ] 5. Configurer shadcn `pnpm dlx shadcn@latest init` et ajouter Button, Input, Card, Badge, Tabs, Tooltip, Dialog
- [ ] 6. Extraire les tokens CSS de `slice-hifi.css` (palette dark + light indigo, polices Geist/Fraunces/JetBrains, radius, shadow) dans `src/client/index.css` sous forme de variables CSS Tailwind v4
- [ ] 7. Charger les Google Fonts dans `index.html` (Geist 700, Fraunces italic, JetBrains Mono)
- [ ] 8. Implémenter `<Topbar>` avec wordmark "SLICE", breadcrumb dynamique (`/new` → `/<api-name>` → `/configure` → `/done`), `<Stepper>` 4 étapes, hint `⌘K`, lien "↻ Recommencer"
- [ ] 9. Implémenter le toggle theme (dark par défaut, persistance localStorage) dans le coin topbar
- [ ] 10. Implémenter `App.tsx` qui rend la Topbar + un placeholder "Écran 1" (route logique en state simple, pas de router pour MVP)
- [ ] 11. Endpoint `GET /api/health` → `{ ok: true }`
- [ ] 12. Smoke test : `pnpm dev` lance les deux serveurs sans erreur, page affiche topbar correctement en dark et light

## Tests TDD

- [ ] `Stepper` rend les 4 étapes et marque correctement done/now/upcoming — `src/client/components/stepper.test.tsx`
- [ ] `Topbar` change le breadcrumb selon `current` prop (1→new, 2→api-name, 3→configure, 4→done) — `src/client/components/topbar.test.tsx`
- [ ] `useTheme` toggle persiste dans localStorage et applique `data-theme` sur `<html>` — `src/client/hooks/use-theme.test.ts`
- [ ] `GET /api/health` retourne `{ ok: true }` avec 200 — `src/server/index.test.ts`

## Tests E2E

Pas d'E2E sur cette phase (squelette).

## UAT

- Ouvrir `http://localhost:5173`, voir la topbar avec wordmark SLICE + stepper sur étape 1.
- Toggle dark/light fonctionne, transition fluide.
- Sur écran < 1024px, topbar reste lisible (responsive minimal).
- `GET http://localhost:3001/api/health` retourne `{"ok":true}`.

## Documentation

- [ ] README.md initial à la racine (titre, description, commandes `pnpm dev`/`build`/`test`)
- [ ] Mettre à jour `CLAUDE.md` section "Stack" si des deps ont divergé

## Definition of Done

- [ ] Tous les tests TDD passent (GREEN)
- [ ] `pnpm dev` lance front + back sans erreur
- [ ] `pnpm build` produit `dist/client/` et `dist/server/` sans erreur
- [ ] `pnpm typecheck` passe sans erreur
- [ ] Topbar fonctionnelle en dark et light, ⌘K hint visible
- [ ] Smoke test manuel OK (UAT)
- [ ] Commit et PR créée
