# PLAN — OAuth-1b : flow client_credentials self-host (cœur)

## Objectif (1 phrase)

Le kit MCP généré pour une auth `oauth2` (mode `env`, self-host) obtient lui-même un access_token via client_credentials, le met en cache, le renouvelle et le rejoue sur 401 — secret jamais exposé.

## Décision de test (D005 — ORIENT, sans spike)

- **Banc kit runtime** (1 process, appels **séquentiels**) + 2 serveurs mockés (token + upstream), dérivé de `mcp-generator.relay.test.ts` → R10-R13, R15, R16/R16bis.
- **R14 (dédup concurrence)** : testé sur le **module `oauth-token` isolé** (importé via `tsx`, `getAccessToken()` ×3 parallèle → 1 fetch), car le kit est mono-session.
- Les tests construisent la config en dur (bypass du Zod https de R9) → `tokenUrl` `http://127.0.0.1:<port>` accepté en test (R19bis = trivial, aucun code spécial).

## Couverture SPEC → tâches

| Règle | Tâche |
|-------|-------|
| Contexte générateur (tokenUrl/scopes) + émission conditionnelle | T1 |
| R10 (env client_id/secret manquants → erreur boot) | T2 |
| R11 (forme du POST token : Basic, grant_type, scope via URLSearchParams) | T3 |
| R12 (access_token attaché en Bearer à l'upstream) | T4 |
| R13 (cache + TTL : expires_in long→1 POST ; =0→2 POST ; absent→300s→1 POST) | T5 |
| R14 (dédup in-flight, module isolé) | T6 |
| R15 (retry 401 : refetch 1×, 2ᵉ 401 → erreur) | T7 |
| R16/R16bis (token endpoint non-2xx → erreur ; token_type≠bearer → erreur) | T8 |
| R17/R17bis (secret absent des fichiers ET des erreurs/logs) | T9 |
| R18 (.env.example vars oauth2) | T10 |
| R19 (bundle oauth2 type-checke) | T11 |
| R20 (relay oauth2 = relai bearer, pas de POST token) | T12 |

## Fichiers impactés

- `src/server/templates/oauth-token.ts.hbs` — **nouveau**. `getAccessToken()` (cache {token, expiresAt}, in-flight promise, marge 30 s, TTL repli 300 s) ; `invalidateToken()`. POST `tokenUrl` (injecté), header `Authorization: Basic <Buffer.from(id:secret).base64>`, body `URLSearchParams({grant_type:'client_credentials', scope?})`. Parse `{access_token, expires_in?, token_type?}` ; `token_type` présent ≠ `bearer` → throw ; erreurs = statut seul (jamais secret/Basic/body réponse).
- `src/server/templates/http-client.ts.hbs` — branche `oauth2` : imports (`getAccessToken`, `invalidateToken` ; `relayedToken` pour relay) ; config env (lit `UPSTREAM_OAUTH_CLIENT_ID/SECRET`, valide en mode env, R10) ; attache `Authorization: Bearer <token>` (env: getAccessToken ; relay: relayedToken) ; **retry 401** (env oauth2 uniquement) : invalidate + 1 refetch + rejoue.
- `src/server/templates/env.example.hbs` — branche oauth2 : `UPSTREAM_OAUTH_CLIENT_ID=` / `UPSTREAM_OAUTH_CLIENT_SECRET=` + `tokenUrl`/scopes en commentaire.
- `src/server/services/mcp-generator.ts` — `TemplateContext.upstreamAuth` += `tokenUrl?`, `scopes?` ; `scopesJoined` ; émission **conditionnelle** de `oauth-token.ts` si `type==='oauth2'`.
- Tests : `mcp-generator.oauth.test.ts` (**nouveau**, runtime kit + module isolé), extension `mcp-generator.snapshot.test.ts` (cas oauth2 R11/R19).

## Tâches TDD (RED → GREEN)

- [x] **T1 — Contexte + émission conditionnelle** : générateur expose tokenUrl/scopes/scopesJoined ; `oauth-token.ts` émis ssi oauth2. (couvert par snapshot T11 + runtime ; commit support.)
- [x] **T2 — R10** : kit oauth2 env sans `UPSTREAM_OAUTH_CLIENT_ID/SECRET` → le serveur refuse de démarrer / erreur claire. RED runtime (serveur n'émet pas "listening on").
- [x] **T3 — R11** : appel d'un tool → le serveur token mocké reçoit `POST`, `Authorization: Basic <base64(id:secret)>`, `Content-Type: x-www-form-urlencoded`, body `grant_type=client_credentials` (+ `scope=a b` si scopes). RED.
- [x] **T4 — R12** : l'upstream mocké reçoit `Authorization: Bearer <access_token retourné par le token mock>`. RED.
- [x] **T5 — R13** : `expires_in:3600` → 2 appels séquentiels → **1** POST token ; `expires_in:0` → 2 POST ; sans `expires_in` → 1 POST (défaut 300 s). RED.
- [x] **T6 — R14** : module `oauth-token` importé isolément, `getAccessToken()` ×3 en parallèle → **1** fetch token (in-flight partagé). RED.
- [x] **T7 — R15** : upstream renvoie 401 puis 200 → 1 refetch token + succès (2 POST token) ; 401 deux fois → erreur remontée (pas de boucle). RED.
- [x] **T8 — R16/R16bis** : token endpoint 500 → erreur claire ; réponse `token_type:'mac'` → erreur. RED.
- [x] **T9 — R17/R17bis** : aucun fichier généré ne contient la valeur du secret ; forcer une erreur token → message sans secret ni base64 ni body réponse. RED.
- [x] **T10 — R18** : `.env.example` oauth2 contient `UPSTREAM_OAUTH_CLIENT_ID`/`UPSTREAM_OAUTH_CLIENT_SECRET`. RED (assertion contenu).
- [x] **T11 — R19** : étendre `mcp-generator.snapshot.test.ts` — bundle oauth2 `tsc --noEmit` OK + `oauth-token.ts` présent. RED.
- [x] **T12 — R20** : kit oauth2 en `MCP_AUTH_MODE=relay` → token de l'agent relayé en Bearer à l'upstream, **aucun** POST tokenUrl. RED (réutilise le banc relai).

## Auto-critique (tient lieu d'/advisor — SPEC + D005 déjà critiquées)

- **Ordre** : T1 (support) ; puis T2-T5, T7, T8 sur le banc kit ; T6 sur le module isolé ; T9-T11 transverses ; T12 relai en dernier.
- **Risque retry 401 dans `call`** : la fonction `call` est partagée tous types. Le retry ne doit s'activer **que** pour oauth2/env (relay = token de l'agent non-rafraîchissable ; bearer/apiKey env = statiques). Brancher via Handlebars `{{#ifEquals oauth2}}` autour du wrap retry → vérifier qu'aucun import/variable ne reste inutilisé (sinon R19 `tsc` casse).
- **Marge 30 s vs TTL court** : ne pas tester le refresh avec `expires_in` court < 30 s (toujours "expiré") ; utiliser 3600 (cache) / 0 (refetch) / absent (défaut 300) — tous déterministes sans mock d'horloge.
- **Mono-session** : ne JAMAIS tester la concurrence via 2 clients MCP parallèles (→ `Server already initialized`) ; R14 passe par le module isolé (D005).
- **Couverture** : R10-R20 mappées. R19bis trivial (tests bypassent Zod).

## Definition of Done

- T1-T12 cochées ; suite complète verte + typecheck ; snapshot oauth2 `tsc` OK.
- Le secret n'apparaît dans aucun fichier généré ni aucun message d'erreur.
- Non-régression : bundles apiKey/bearer/none inchangés (snapshot/relay existants verts).
- Hors scope (→ 1c) : runtime hébergé `hosted-mcp-factory` oauth2 ; (→ 1d) UI + corpus.
