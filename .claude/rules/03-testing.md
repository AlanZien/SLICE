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
- Code genere (migrations, types auto-generes) — MAIS : tester son **comportement** quand il est critique (cf. règle « tests coûteux » ci-dessous : le relai d'auth du code MCP généré a été validé en E2E runtime via `tsx`)
- Styles purement visuels (couverts par UAT)

## Patterns promus (LEARN)

### Tests coûteux / d'intégration : tracés, jamais omis silencieusement
*Issu de LEARN après 5 occurrences détectées (phases 01, 02, 03, 04, Pivot-2).*

Un test à coût élevé ou à dépendance externe (perf p95, `docker build`, run d'un binaire/serveur généré, lancement d'un service) ne doit **jamais** être simplement absent. Règles :
- **Le marquer explicitement** dans le PLAN.md de la phase (« E2E X reporté car dépendance Docker en CI ») et le tracer dans UAT.md (test manuel) + RETRO.md. Un test manquant non tracé = dette invisible.
- **Préférer un runner léger** quand c'est possible plutôt que de reporter : le code MCP généré se teste en runtime via `tsx` (pas de build `tsc`) + serveur enfant + upstream mocké (cf. `mcp-generator.relay.test.ts`). Idem, valider la compilation du bundle via le `tsc` smoke (cf. `mcp-generator.snapshot.test.ts`).
- **Dette perf accumulée** : les tests perf p95 (R1.1.9 parse, R1.2.5 filtre, conversions) ont été reportés de phase en phase. À planifier dans un batch dédié (cf. BACKLOG) avant tout claim de performance produit.

---
Ce fichier est mis a jour par le workflow FORGE (phase LEARN) quand des patterns de tests recurrents sont detectes.
