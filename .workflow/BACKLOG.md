# Backlog

Liste append-only des features et idees a developper.
A consulter en fin de DELIVER pour proposer la prochaine feature.

## Features prioritaires

- [ ] {{Premiere idee a developper}}

## Features secondaires

- [ ] {{Idee moins prioritaire mais prevue}}

## Qualification avancée de la spec (V1.1) — issu de réflexion qualité 2026-05-27

Le MVP fait du filtrage léger (3 règles dures, cf. phase 04 tâche 12). La qualification avancée est reportée pour limiter le scope MVP.

- [ ] Intégrer Spectral (linter OpenAPI open source) avec règles custom MCP-oriented
- [ ] Rapport qualité détaillé (✅ utilisable / ⚠️ dégradé / ❌ rejeté) affiché avant l'écran de sélection
- [ ] Détection prompt injection dans les descriptions OpenAPI (patterns "ignore previous instructions", etc.) — surface d'attaque MCP documentée
- [ ] Marquage des endpoints destructifs (DELETE, POST critiques) dans le code MCP généré (warning côté agent)
- [ ] Détection automatique du pattern de pagination (cursor / offset / page) et injection d'un helper dans le MCP
- [ ] Extraction des `x-rate-limit-*` extensions pour exposer les hints côté MCP
- [ ] Support OAuth2 (auth amont MCP → API) — débloque le rejet dur du MVP
- [ ] Support Basic Auth (idem)
- [ ] Validation sémantique : cohérence requestBody/responses, schémas $ref cassés, types inconsistants

## Idees a clarifier

- [ ] {{Idee floue qui demande un brainstorm avant de devenir une feature concrete}}

---
Alimente librement par l'utilisateur (ajout d'idees, reorganisation).
Cochee automatiquement par FORGE en phase DELIVER quand une feature est livree.
