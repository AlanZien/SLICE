# PLAN — OAuth-1a : détection & acceptation (backend, pas de codegen)

## Objectif (1 phrase)

Arrêter de rejeter les specs OAuth2/OIDC et faire transiter un variant d'auth `oauth2` (avec `tokenUrl`/`scopes`) de la détection jusqu'à la config, sans toucher au code généré.

## Couverture SPEC → tâches

| Règle SPEC | Tâche |
|------------|-------|
| Modèle `oauth2` variant | T1 |
| R9 (validation Zod oauth2) | T2 |
| R1, R2, R5 (détection clientCredentials, tokenUrl relatif, fallback) | T3 |
| R3, R4 (oauth2 non-cc → bearer ; oidc → bearer) | T4 |
| R7, R7bis (priorité + filtrage schémas référencés) | T5 |
| R6, R8 (parser accepte oauth2/oidc, rejette basic/digest seuls) | T6 |
| Propagation (B1) jusqu'à `DefaultConfig`/`ParsedSpec` | T7 |

## Fichiers impactés

- `src/shared/types.ts` — `UpstreamAuthType` += `'oauth2'` ; `UpstreamAuth` += `tokenUrl?: string`, `scopes?: string[]`.
- `src/shared/config-schema.ts` — variant `oauth2` dans `upstreamAuthSchema` (tokenUrl https absolu, scopes optionnels).
- `src/server/services/auth-detector.ts` — `DetectedAuth` += `tokenUrl?`/`scopes?` ; détection `oauth2` ; nouvelle signature `detectAuth(schemes, opts?: { referenced?: Set<string>; baseUrl?: string })` (rétro-compatible).
- `src/server/services/parser.ts` — extraire `collectReferencedSchemeNames(doc): Set<string>` (factorisé) ; `assertSupportedAuth` traite oauth2/oidc comme supportés.
- `src/server/services/spec-normalizer.ts` — calcule les schémas référencés, les passe à `detectAuth` avec `baseUrl` ; propage `tokenUrl/scopes` dans `defaultConfig.upstreamAuth` + `ParsedSpec`.
- `src/server/services/spec-to-hosted-config.ts` — aucun changement de code (copie déjà `config.upstreamAuth`) ; vérifié par le type.

Tests : `config-schema.test.ts`, `auth-detector.test.ts`, `parser.test.ts` (réécrire le cas oauth2), `spec-normalizer.test.ts`.

## Tâches TDD (RED → GREEN par règle)

- [x] **T1 — Types** (support, pas de test direct) : étendre `UpstreamAuthType`, `UpstreamAuth`, `DetectedAuth`. Le typecheck est le garde-fou.
- [x] **T2 — Validation Zod (R9)** : RED `config-schema.test.ts` — `{type:'oauth2', tokenUrl:'https://a/t', scopes:['x']}` accepté ; `tokenUrl` absent / relatif / `http://` rejeté ; scopes optionnel. GREEN : ajouter le variant au discriminatedUnion (tokenUrl via `z.string().url()` + refine https).
- [x] **T3 — Détection clientCredentials (R1, R2, R5)** : RED `auth-detector.test.ts` — scheme `oauth2.flows.clientCredentials.tokenUrl` absolu → `{type:'oauth2', tokenUrl, scopes}` ; tokenUrl relatif + baseUrl → résolu absolu ; clientCredentials sans tokenUrl → `{type:'bearer'}`. GREEN : brancher la détection oauth2 dans `detectAuth`.
- [x] **T4 — Autres flows / OIDC (R3, R4)** : RED — oauth2 `authorizationCode`-only → `bearer` ; `type:'openIdConnect'` → `bearer`. GREEN.
- [x] **T5 — Priorité + filtrage référencés (R7, R7bis)** : RED — spec oauth2-cc + bearer tous deux référencés → `oauth2` gagne ; oauth2 **déclaré non référencé** + bearer référencé → `bearer` (filtrage). GREEN : factoriser `collectReferencedSchemeNames`, filtrer dans `detectAuth` quand `opts.referenced` fourni, ordre de priorité oauth2-cc > bearer > apiKey(header) > apiKey(query) > none.
- [x] **T6 — Parser accepte oauth2/oidc (R6, R8)** : RED — réécrire `parser.test.ts:313` (oauth2 implicit → **parse OK**, plus `UNSUPPORTED_AUTH`) ; ajouter oauth2-clientCredentials-only et oidc-only → parse OK ; non-régression basic-only / digest-only → `UNSUPPORTED_AUTH`. GREEN : dans `assertSupportedAuth`, `type==='oauth2' || type==='openidconnect'` → `supportedFound=true`.
- [x] **T7 — Propagation (B1)** : RED `spec-normalizer.test.ts` — `normalizeSpec` d'une spec oauth2-cc → `defaultConfig.upstreamAuth = {type:'oauth2', tokenUrl, scopes}` et `authType==='oauth2'`. GREEN : passer `referenced` + `baseUrl` à `detectAuth`, propager le variant.

## Hors scope 1a

Tout le code généré (templates), le runtime hébergé, l'UI, le corpus. → sous-phases 1b/1c/1d.

## Auto-critique (tient lieu d'/advisor — sous-phase backend simple, SPEC déjà critiquée)

- **Ordre** : T1 (types) d'abord car tout en dépend ; T2/T3/T4 indépendants ; T5 introduit le filtrage référencés (refactor partagé avec parser) → avant T6 qui réutilise `collectReferencedSchemeNames` ; T7 en dernier (intègre tout).
- **Risque de régression** (T5) : aujourd'hui `detectAuth` voit TOUS les schémas ; le filtrage par référencés change le comportement d'une spec qui déclare un scheme non utilisé. Le test `parser.test.ts:390` (« oauth2 déclaré non utilisé → bearer ») devient un test de `detectAuth` filtré — à vérifier qu'il reste vert.
- **Validation `tokenUrl` en test** (R19bis) : ne concerne pas 1a (pas de runtime ici) ; la validation https stricte de R9 est OK car 1a ne lance aucun serveur token.
- **Tests couvrent toutes les règles 1a** : R1-R9 mappées (table ci-dessus). ✓

## Definition of Done

- Toutes les cases T1-T7 cochées.
- Suite complète verte + typecheck.
- Une spec OAuth2 (clientCredentials, authorizationCode, OIDC) **n'est plus rejetée** ; basic/digest seuls le restent.
- `defaultConfig.upstreamAuth` porte `tokenUrl/scopes` pour clientCredentials.
- Aucun changement de code généré (templates intacts) → non-régression snapshot/relay.
