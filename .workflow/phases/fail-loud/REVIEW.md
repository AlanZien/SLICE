# REVIEW — Phase fail-loud (2026-06-06, PR #39)

## Ce qui a bien fonctionné

- **Exploration préalable exhaustive** : un sous-agent a cartographié toutes les approximations silencieuses du codebase avant de rédiger la SPEC. Ça a permis d'identifier T11 (schema_fallback sur propriété body flattenée) qui n'était pas évident sans lire `zod-schema-builder.ts`.
- **TDD propre, 5 fichiers, 0 régression** : 16 tests ajoutés, cycle RED/GREEN/REFACTOR sur les deux couches (normalizer + UI) indépendamment.
- **Critique advisor utile** : a détecté le cas manquant T11 (propriétés body individuelles non inspectées). Correction simple mais réelle.
- **REFACTOR concret** : fusion des deux `useMemo` (DRY) + extraction de `computeApproximations` (lisibilité). Pas de refactor cosmétique.

## Ce qui a été difficile

Rien de bloquant. Le seul point d'attention : la détection `schema_fallback` sur le body nécessite d'inspecter à la fois le root schema ET les propriétés individuelles — logique à deux niveaux, facile à oublier.

## Décisions prises en cours de route

- **Compteur toujours visible** (même si tout est full) : décision de Cedric pendant SPEC — donne une confirmation même au cas nominal.
- **Pas de shared utility pour le calcul du rapport** : refusé car un seul consommateur (ConfigScreen). Over-engineering pour MVP.
- **Sémantique cumulative des counts** : un endpoint peut contribuer à plusieurs lignes (ex. `non_json_body` + `cookie_param`). Conforme à SPEC R5, pas un bug.

## Patterns observés

Aucun nouveau pattern à 3 occurrences détecté. Point à surveiller :
- La logique "exploration → SPEC → PLAN" avec sous-agent de cartographie a fonctionné particulièrement bien pour identifier les surfaces d'approximation. À réutiliser pour des features d'instrumentation similaires.
