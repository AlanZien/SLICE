# SPEC — Rapport fail-loud (screen 3)

## Contexte

Actuellement SLICE génère du code sans jamais signaler à l'utilisateur ce qui n'a pas pu être fidèlement représenté : schémas oneOf/anyOf/allOf tombent silencieusement à `z.string()`, les corps non-JSON ne produisent aucun paramètre body, les cookies sont parsés mais non transmis au runtime. L'utilisateur télécharge un MCP sans savoir que certains endpoints sont dégradés.

---

## Règles métier

### R1 — Catégorisation par endpoint

Chaque endpoint normalisé reçoit un champ `approximations?: ApproximationKind[]` (absent ou vide = fully supported). Les valeurs possibles :

| Code | Condition | Conséquence pour l'utilisateur |
|------|-----------|-------------------------------|
| `non_json_body` | `requestBody` existe dans la spec mais aucun `application/json` content-type → zéro param body généré | L'agent ne peut pas envoyer de corps à cet endpoint |
| `cookie_param` | Au moins un param `in: 'cookie'` | Ces params s'affichent à l'agent mais ne sont jamais transmis dans les appels HTTP |
| `schema_fallback` | Au moins un param (hors body droppé) a un schéma non reconnu (oneOf / anyOf / allOf / type inconnu) → rabattu sur `z.string()` | L'agent voit le param mais sans contrainte de type précise |

Un endpoint peut cumuler plusieurs codes. Un endpoint sans requestBody JSON-body et sans schema complexe et sans cookie = `approximations` absent.

### R2 — Propagation dans ParsedSpec

Ajouter dans `shared/types.ts` :
```typescript
export type ApproximationKind = 'non_json_body' | 'cookie_param' | 'schema_fallback';

// Dans Endpoint :
approximations?: ApproximationKind[];
```

Règle de rétrocompatibilité : `undefined` ≡ `[]` (fully supported). Les clients qui ignorent ce champ ne cassent pas.

### R3 — Détection pendant la normalisation

**`non_json_body`** (`spec-normalizer.ts`) :
- Condition : `rawEndpoint.requestBody` est défini ET `flattenRequestBody(rawEndpoint.requestBody)` retourne un tableau vide
- Ajouter `non_json_body` aux approximations de cet endpoint

**`cookie_param`** (`spec-normalizer.ts`) :
- Condition : au moins un param brut a `in === 'cookie'` (déjà parsé, affiché, mais non transmis)
- Ajouter `cookie_param`

**`schema_fallback`** (`spec-normalizer.ts`) :
- Condition : pour au moins un param (path / query / header / body), le schéma OpenAPI brut (`rawParam.schema`) contient `oneOf`, `anyOf`, ou `allOf`, OU son `type` n'est pas dans `['string', 'integer', 'number', 'boolean', 'array', 'object']`
- Ajouter `schema_fallback`
- NE PAS marquer les params sans schéma du tout (ex. param path simple sans schéma = normal)

### R4 — Calcul du rapport côté client

Sur screen 3 (`ConfigScreen`), à partir de `parsedSpec` et `selectedIds` :

```
selectedEndpoints = parsedSpec.groups.flatAll(endpoints).filter(selected)
total   = selectedIds.length                        // endpoints demandés par l'utilisateur
full    = count(e.approximations est vide ou absent)
partial = count(e.approximations non vide)          // peut cumuler plusieurs kinds
```

R4.1 — Afficher **toujours** le compteur `total / total endpoints in MCP` (confirmation que tous les endpoints demandés ont été inclus).

R4.2 — Si `partial === 0` : ligne de compteur seule, sans détail dessous.

R4.3 — Si `partial >= 1` : compteur + détail des approximations dessous.

### R5 — Contenu du rapport

**Ligne de compteur (toujours affichée)** :
```
[quand partial === 0]  N / N endpoints in MCP  ·  All fully supported
[quand partial >= 1]   N / N endpoints in MCP
```

**Lignes de détail (uniquement si partial >= 1)** — une ligne par kind présent :
```
  ✓  F fully supported
  ⚠  X with approximated schema (oneOf / anyOf → string)
  ⬜  Y with no body support (non-JSON request body)
  🔒  Z with cookie params (not transmitted at runtime)
```

- Informatif uniquement — **ne bloque pas** Generate ni Deploy
- Un endpoint peut contribuer à plusieurs lignes de détail
- F = nombre d'endpoints entièrement full (approximations vide)
- X/Y/Z = nombre d'endpoints ayant ce kind (pas le nombre de params)
- Ne montrer que les kinds présents parmi les sélectionnés

### R6 — Pas de changement des routes backend

Le rapport est calculé entièrement côté client à partir de `ParsedSpec`. Zéro modification à `/api/generate` ni `/api/host`. Pas de nouvelle route.

---

## Cas limites

- Si tous les endpoints sélectionnés ont des approximations → `full = 0` → ligne `✓  0 fully supported` visible (ne pas masquer)
- Spec sans requestBody nulle part → `non_json_body` n'apparaît jamais → normal
- Endpoint excluded (`excludedCount`) → hors scope du rapport (non sélectionnable)
- `approximations: []` (tableau vide explicite) ≡ `undefined` ≡ fully supported

---

## Tests TDD obligatoires

### Backend (spec-normalizer)

| # | Input | Attendu |
|---|-------|---------|
| T1 | Endpoint avec `requestBody` non-JSON (ex. multipart) | `approximations` contient `non_json_body` |
| T2 | Endpoint avec `requestBody` JSON → params body générés | `non_json_body` ABSENT |
| T3 | Endpoint avec un param `in: 'cookie'` | `approximations` contient `cookie_param` |
| T4 | Endpoint avec schéma `oneOf` sur un param | `approximations` contient `schema_fallback` |
| T5 | Endpoint avec schéma `anyOf` sur un param | `approximations` contient `schema_fallback` |
| T6 | Endpoint avec schéma `allOf` sur un param | `approximations` contient `schema_fallback` |
| T7 | Endpoint avec schéma type inconnu (`type: 'xml'`) | `approximations` contient `schema_fallback` |
| T8 | Endpoint fully supported (query string, body JSON avec types reconnus) | `approximations` absent ou `[]` |
| T9 | Endpoint path-only (GET sans body, params path simples) | `approximations` absent ou `[]` |
| T10 | Endpoint avec non_json_body ET cookie_param | `approximations` contient les deux codes |

### Frontend (ConfigScreen)

| # | Scenario | Attendu |
|---|----------|---------|
| F1 | Tous endpoints sélectionnés = full support | Compteur `N/N · All fully supported`, pas de lignes de détail |
| F2 | Un endpoint avec `schema_fallback` sélectionné | Compteur + ligne ⚠ visible |
| F3 | Counts corrects (F full, X schema_fallback, Y non_json_body) | Valeurs correctes dans chaque ligne |
| F4 | Endpoint partial non sélectionné → n'impacte pas le rapport | Pas de ligne ⚠ si le partial n'est pas dans selectedIds |
| F5 | 3 endpoints sélectionnés, 3 générés → compteur affiché | `3 / 3 endpoints in MCP` |

---

## Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/shared/types.ts` | `ApproximationKind` type + `Endpoint.approximations?` |
| `src/server/services/spec-normalizer.ts` | Détection non_json_body, cookie_param, schema_fallback |
| `src/server/services/spec-normalizer.test.ts` | Tests T1-T10 |
| `src/client/screens/config.tsx` (ou équivalent screen 3) | Bandeau rapport |
| `src/client/screens/config.test.tsx` (ou équivalent) | Tests F1-F4 |

Pas de changement aux routes backend, aux templates Handlebars, ni à `zod-schema-builder.ts`.
