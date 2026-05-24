# Plan : Phase {{NN}} — {{Nom}}

Date : {{YYYY-MM-DD}}
SPEC : .workflow/SPEC.md
Statut : DRAFT | VALIDATED | IN_PROGRESS | DONE

## Objectif

{{Ce que cette phase doit accomplir — en une phrase}}

## Fichiers impactes

- [ ] {{path/to/file1.ts}} — {{ce qui change}}
- [ ] {{path/to/file2.ts}} — {{ce qui change}}

## Taches

- [ ] 1. {{Tache}}
- [ ] 2. {{Tache}}
- [ ] 3. {{Tache}}

## Tests TDD

Tests a ecrire EN PREMIER (cycle RED > GREEN > REFACTOR).

- [ ] {{test_description}} — fichier : {{path/to/file.test.ts}}
- [ ] {{test_description}} — fichier : {{path/to/file.test.ts}}

## Tests E2E

> Optionnel — uniquement si la phase inclut des parcours utilisateur complets.

- [ ] {{Scenario E2E}} — fichier : {{path/to/e2e.test.ts}}

## UAT

Scenarios a generer dans .workflow/UAT.md pendant DELIVER.

- {{Scenario de test manuel 1}}
- {{Scenario de test manuel 2}}

## Documentation

> Optionnel — uniquement si la phase modifie une API ou un comportement visible.

- [ ] {{Mettre a jour README / docs API / changelog}}

## Definition of Done

- [ ] Tous les tests TDD passent (GREEN)
- [ ] Tests E2E passent (si applicable)
- [ ] /review sans probleme critique
- [ ] Code commite et PR creee
- [ ] UAT.md mis a jour
- [ ] Documentation a jour (si applicable)

---
Genere par le workflow FORGE (phase REFINE). Valide par l'utilisateur avant GENERATE.
