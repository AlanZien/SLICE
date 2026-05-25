# Plan : Phase 13 — Polish UX + documentation finale

Date : 2026-05-25
SPEC : .workflow/SPEC.md (section 2.6 transverses + finitions)
Statut : DRAFT

## Objectif

Corriger les rugosités UX restantes (skeletons, transitions inter-écrans, ErrorBoundary global), finaliser la documentation utilisateur et développeur, préparer la sortie du MVP.

## Fichiers impactes

- [ ] `src/client/components/skeleton.tsx` — loading skeleton (rows + sidebar) pour écran 2
- [ ] `src/client/components/error-boundary.tsx` — ErrorBoundary React global
- [ ] `src/client/components/screen-transition.tsx` — wrapper fade-in 260ms entre écrans (respecte reduced-motion)
- [ ] `src/client/App.tsx` — wrap chaque écran dans ScreenTransition + ErrorBoundary
- [ ] `README.md` — finalisation (description, installation, usage, sécurité, a11y, contributions)
- [ ] `docs/USER-GUIDE.md` — guide utilisateur (4 écrans expliqués, FAQ)
- [ ] `CHANGELOG.md` — version 0.1.0 (MVP)

## Taches

- [ ] 1. Implémenter `<Skeleton>` : variantes `endpoint-row` et `sidebar`, animation pulse subtile. Affiché pendant `useParseSpec` quand la requête `/api/upload` met > 800ms à répondre.
- [ ] 2. Câbler skeleton dans transition écran 1 → écran 2 si latence > 800ms
- [ ] 3. Implémenter `<ErrorBoundary>` : catch erreurs React, affiche écran de récupération "Une erreur est survenue, ↻ Recommencer" avec bouton reset complet
- [ ] 4. Implémenter `<ScreenTransition>` : fade-in 260ms ease-out + translate-y(4px → 0), wrapper `motion-safe:` pour respect de reduced-motion
- [ ] 5. Vérifier que **un seul bouton primaire** est visible par écran (SPEC §0 principe 4) :
  - Écran 1 : "Choisir un fichier" (dans dropzone)
  - Écran 2 : "Continuer →"
  - Écran 3 : "Générer mon MCP"
  - Écran 4 : "Télécharger à nouveau"
  - Si plusieurs primaires trouvés → corriger (le 2e devient secondary/ghost)
- [ ] 6. Audit visuel final : cohérence des espacements (grille 4px/8px), respect des radius 5/8/12/99, typo Geist/Fraunces/JetBrains
- [ ] 7. Finaliser `README.md` :
  - Titre + tagline + screenshot
  - Quick start : `pnpm install && pnpm dev`
  - Formats acceptés : OpenAPI 3.x, Swagger 2.0, Postman v2
  - Sécurité (lien docs/security.md)
  - Accessibilité (lien docs/USER-GUIDE.md a11y)
  - Tests : `pnpm test`, `pnpm test:e2e:local`
  - Contributions
- [ ] 8. Créer `docs/USER-GUIDE.md` : explique le parcours en 3 étapes côté utilisateur final, FAQ ("comment je connecte à Claude Desktop ?", "qu'est-ce qu'un endpoint ?", "qu'est-ce que je télécharge ?", "où sont mes données ?")
- [ ] 9. Créer `CHANGELOG.md` (Keep a Changelog) avec l'entrée v0.1.0
- [ ] 10. Smoke test final : démo complète chronométrée, mesurer Time-to-MCP en conditions réelles (cible : < 5 min)

## Tests TDD

- [ ] `<Skeleton variant="endpoint-row">` rend la bonne structure — `skeleton.test.tsx`
- [ ] `<ErrorBoundary>` catch une erreur enfant et affiche le fallback — `error-boundary.test.tsx`
- [ ] `<ErrorBoundary>` bouton "Recommencer" reset l'état global — idem
- [ ] `<ScreenTransition>` applique fade-in en motion-safe — `screen-transition.test.tsx`
- [ ] `<ScreenTransition>` sans anim si reduced-motion — idem

## Tests E2E

- [ ] Provoquer une erreur React (composant qui throw) → ErrorBoundary visible avec bouton de recovery
- [ ] Mesurer latence d'upload simulée 1.5s → skeleton visible pendant l'attente

## UAT

- Démo de bout en bout chronométrée : < 5 min depuis upload spec Shopify jusqu'à un agent qui appelle un endpoint réel.
- Aucun "saut" visuel entre écrans, transitions fluides.
- Provoquer une erreur (ex. couper le backend) → ErrorBoundary catch correctement.
- Inspection visuelle finale en dark et light : tout est aligné, espacements cohérents.

## Documentation

- [ ] README finalisé
- [ ] `docs/USER-GUIDE.md` créé
- [ ] CHANGELOG v0.1.0 créé
- [ ] Tous les docs existants relus (API.md, security.md, mcp-template.md, e2e.md, token-estimator.md)

## Definition of Done

- [ ] Tests TDD passent
- [ ] Smoke test démo < 5 min validé
- [ ] README + USER-GUIDE + CHANGELOG publiés
- [ ] /review final sans problème critique
- [ ] MVP prêt pour merge sur main
- [ ] Commit + PR (PR finale de la milestone MVP)
