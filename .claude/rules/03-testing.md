# Strategie de tests

## Approche

- TDD strict : tests ecrits AVANT le code de production
- Cycle RED > GREEN > REFACTOR pour chaque fonctionnalite

## Tests unitaires

- Framework : {{Vitest / Jest / Pytest / ...}}
- Commande : `{{npm test / bun test / pytest}}`
- Convention de nommage : {{fichier.test.ts / test_fichier.py}}
- Couverture cible : {{80% / ... (si applicable)}}

## Tests E2E / Integration

- Framework : {{Playwright / Cypress / ... (si applicable)}}
- Commande : `{{npm run test:e2e}}`
- Scenarios couverts : {{parcours utilisateur critiques}}

## Ce qu'on teste

- Logique metier (toujours)
- Cas limites et cas d'erreur
- Integrations externes (avec mocks si necessaire)
- {{Regles specifiques au projet}}

## Ce qu'on ne teste PAS

- Getters/setters triviaux
- Code genere (migrations, types auto-generes)
- Styles purement visuels (couverts par UAT)

---
Ce fichier est mis a jour par le workflow FORGE (phase LEARN) quand des patterns de tests recurrents sont detectes.
