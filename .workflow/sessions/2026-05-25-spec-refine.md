# Session 2026-05-25 — SPEC + ORIENT (court-circuité) + REFINE

## Phases parcourues

1. **SPEC** — `.workflow/SPEC.md` rédigée (55 règles métier R1.1.1–R1.6.9, design system extrait de Claude Design, 4 écrans détaillés, parcours utilisateur, principe de conception "traducteur fidèle"). Critique advisor + corrections Bloquant/Important appliquées. Validée par l'utilisateur.

2. **ORIENT (court-circuité)** — Décision D001 (Handlebars vs Eta → Handlebars) prise sans spike, tracée dans `.workflow/DECISIONS.md`. CLAUDE.md mis à jour avec les 3 libs back (handlebars, swagger2openapi, postman-to-openapi).

3. **REFINE** — 13 PLAN.md créés dans `.workflow/phases/0X-*/PLAN.md`. Critique advisor → splits requis (07 → 07/08/09, 09 → 11/12/13). Couverture vérifiée : 55/55 règles avec tâche + test TDD dans `.workflow/phases/COVERAGE.md`. Validé par l'utilisateur.

## Décisions clés prises pendant la session

- **Formats sources acceptés (R1.1.3)** : OpenAPI 3.x natif + Swagger 2.0 + Postman v2 (les deux derniers via conversion auto silencieuse). API Blueprint / RAML / GraphQL / AsyncAPI / gRPC / WSDL hors scope MVP.
- **Génération synchrone** : un seul POST /api/generate qui stream le ZIP en réponse, in-memory.
- **Pas de preview du code** dans l'UI MVP.
- **Pas de modale en MVP** : "↻ Recommencer" assumé destructif sans confirmation.
- **Principe de conception** : SLICE est traducteur fidèle OpenAPI → MCP, pas un garde-fou runtime (pas de warning, pas de pagination par défaut, pas de confirmation destructive). Les schémas de réponse OpenAPI sont transcrits fidèlement dans les tools MCP.
- **Heuristique tokens calibrée bloquant en phase 05** : tolérance ±15% vs tiktoken cl100k_base sur 4 fixtures réelles. Si la formule ne tient pas, escalade.
- **Templating** : Handlebars (D001).

## Fichiers produits / modifiés

- `.workflow/SPEC.md` (réécriture complète)
- `.workflow/DECISIONS.md` (D001 ajoutée)
- `.workflow/phases/01-skeleton/PLAN.md`
- `.workflow/phases/02-upload-parsing/PLAN.md`
- `.workflow/phases/03-format-conversion/PLAN.md`
- `.workflow/phases/04-selection-screen/PLAN.md`
- `.workflow/phases/05-token-counter/PLAN.md`
- `.workflow/phases/06-config-screen/PLAN.md`
- `.workflow/phases/07-mcp-templates/PLAN.md`
- `.workflow/phases/08-mcp-api-zip/PLAN.md`
- `.workflow/phases/09-mcp-e2e/PLAN.md`
- `.workflow/phases/10-success-screen/PLAN.md`
- `.workflow/phases/11-security-backend/PLAN.md`
- `.workflow/phases/12-a11y-responsive/PLAN.md`
- `.workflow/phases/13-polish-docs/PLAN.md`
- `.workflow/phases/COVERAGE.md`
- `CLAUDE.md` (stack mise à jour + section "Phase en cours")

## Prochaines étapes (reprise après /compact)

1. **BOOTSTRAP** restant :
   - `git init` + premier commit
   - `/permissions` (cadrer l'autonomie Claude pour pnpm/git/build)
   - `gh repo create slice --private --source=. --remote=origin` + push initial `main`
2. **GENERATE phase 01** (`.workflow/phases/01-skeleton/PLAN.md`) :
   - Branche `feature/01-skeleton`
   - Cycle TDD strict : RED → GREEN → REFACTOR par tâche
   - Tests prioritaires : Stepper, Topbar, useTheme, /api/health
3. Phases suivantes : 02 → 13 selon COVERAGE.md (durée estimée ~14 jours)

## Points de vigilance pour la suite

- Le calibrage tokens (phase 05) est **bloquant** : si la formule ne tient pas ±15%, escalader avant de poursuivre.
- Le test E2E phase 09 (`pnpm install` + build) doit être gaté `RUN_E2E=1` pour éviter de ralentir la CI courante.
- R1.6.8 (body limit 15 Mo) est posée en phase 08, vérifiée en phase 11. Pas de double config.
- Le responsive sidebar est centralisé en phase 12, pas en phase 04.
