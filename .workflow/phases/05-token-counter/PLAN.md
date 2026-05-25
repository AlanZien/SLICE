# Plan : Phase 05 — Compteur de tokens (calibrage + UI)

Date : 2026-05-25
SPEC : .workflow/SPEC.md (R1.2.8 — calibrage bloquant)
Statut : DRAFT

## Objectif

Calibrer la formule d'estimation des tokens sur des fixtures réelles (cible : tolérance ±15% vs `tiktoken cl100k_base`), puis brancher le compteur dans la sidebar de l'écran 2 (remplacer le placeholder de la phase 04).

## ⚠️ Phase bloquante

Si après calibrage la formule heuristique ne tient pas ±15% sur les 4 fixtures, **stopper la phase** et escalader pour changer de stratégie (option : calcul tiktoken côté backend exposé via une route `/api/tokens-estimate`, perf à mesurer).

## Fichiers impactes

- [ ] `fixtures/calibration/shopify-50.yaml` — fixture réelle (déjà créée phase 02)
- [ ] `fixtures/calibration/stripe-200.json` — fixture Stripe OpenAPI publique
- [ ] `fixtures/calibration/github-100.json` — fixture GitHub OpenAPI publique (subset)
- [ ] `fixtures/calibration/custom-10.yaml` — petite fixture custom 10 endpoints
- [ ] `scripts/calibrate-tokens.ts` — script de mesure (compte réel via tiktoken + ajustement coefficients)
- [ ] `src/shared/token-estimator.ts` — formule figée partagée front/back
- [ ] `src/client/components/economy-counter.tsx` — bignum Fraunces italic + libellé
- [ ] `src/client/components/selection-sidebar.tsx` — remplace placeholder par `<EconomyCounter>`
- [ ] `src/client/hooks/use-selection.ts` — ajout `economy()` qui calcule via `token-estimator`
- [ ] `docs/token-estimator.md` — explication de la formule, méthodologie de calibrage, résultats sur les 4 fixtures

## Taches

- [ ] 1. Installer dev dep : `@dqbd/tiktoken` (ou `js-tiktoken` selon perf)
- [ ] 2. Récupérer les fixtures OpenAPI réelles : Stripe (`stripe-openapi`), GitHub (subset), et créer une custom-10 minimale
- [ ] 3. Implémenter `scripts/calibrate-tokens.ts` :
  - Parse chaque fixture
  - Pour chaque endpoint : générer le bloc texte qu'il occuperait dans une déclaration MCP tool (nom + description + schéma Zod inputs) sous forme de string
  - Compter les tokens réels via `tiktoken cl100k_base` sur ce bloc
  - Comparer avec l'estimation de la formule courante
  - Ajuster les coefficients (multiplicateur params, longueur description) pour minimiser l'écart sur les 4 fixtures
  - Output : tableau d'écarts par fixture + coefficients optimaux + verdict pass/fail (±15%)
- [ ] 4. Itérer sur les coefficients jusqu'à passer ±15% sur les 4 fixtures. Si impossible, escalader.
- [ ] 5. Figer la formule dans `src/shared/token-estimator.ts` :
  - `estimateEndpointTokens(endpoint): number`
  - `estimateSpecTokens(parsedSpec): number`
  - `computeEconomy(parsedSpec, selectedIds): { selected, total, percent }`
- [ ] 6. Implémenter `<EconomyCounter percent />` : bignum Fraunces italic 88px du pourcentage + libellé "économisé / vs spec complète" en JetBrains Mono mute
- [ ] 7. Câbler dans `<SelectionSidebar>` : remplacer le placeholder par `<EconomyCounter percent={economy()} />`, recalcul en temps réel à chaque toggle (memo si perf)
- [ ] 8. Documenter `docs/token-estimator.md` : formule retenue, coefficients, écarts mesurés par fixture, limites connues

## Tests TDD

- [ ] `estimateEndpointTokens(simpleGET)` retourne une valeur cohérente — `token-estimator.test.ts`
- [ ] `estimateSpecTokens(emptySpec)` retourne 0 — idem
- [ ] `computeEconomy(spec, fullSet)` retourne 0% (rien d'économisé) — idem
- [ ] `computeEconomy(spec, emptySet)` retourne 100% — idem
- [ ] `computeEconomy(spec, halfSet)` retourne entre 40% et 60% — idem
- [ ] **Test de calibrage** : pour chaque fixture (Shopify-50, Stripe-200, GitHub-100, custom-10), l'écart entre `estimateSpecTokens` et le comptage tiktoken réel est ≤ 15% — `token-estimator.calibration.test.ts`
- [ ] `<EconomyCounter percent={73}>` affiche "73%" avec la bonne typo Fraunces — `economy-counter.test.tsx`
- [ ] `<SelectionSidebar>` met à jour le compteur quand la sélection change — `selection-sidebar.test.tsx`

## UAT

- Avec une vraie spec Shopify : le compteur affiche un % cohérent (pas 0%, pas 100%), variable en cochant/décochant.
- En cochant tous les endpoints → compteur affiche 0% (rien économisé).
- En décochant tout → compteur affiche 100% (mais bouton Continuer désactivé).
- Le chiffre affiché diffère de moins de 15% du calcul tiktoken réel (vérifié via le script de calibrage).

## Documentation

- [ ] `docs/token-estimator.md` créé avec méthodo + résultats
- [ ] Mention dans README que le compteur est calibré sur fixtures réelles

## Definition of Done

- [ ] Calibrage passe ±15% sur les 4 fixtures (sinon escalade documentée)
- [ ] Tests TDD passent
- [ ] Compteur visible et fonctionnel dans l'écran 2
- [ ] doc/token-estimator.md publié
- [ ] /review sans problème critique
- [ ] Commit + PR
