# SPEC — OAuth2 amont (client credentials) — phase OAuth-1

## Contexte & objectif

Aujourd'hui une spec OpenAPI dont l'auth amont est OAuth2 est **rejetée** au parsing (`UNSUPPORTED_AUTH`, cf. `parser.ts:241`). Le corpus check (500 specs APIs.guru) montre que **~1/5 des APIs réelles** sont écartées pour cette raison (62 OAuth sur 500). C'est le plus gros levier de couverture.

**Objectif de cette phase** : ne plus rejeter OAuth2, et **supporter pleinement le flow `client_credentials`** (machine-à-machine, sans humain dans la boucle) dans le code MCP généré auto-hébergé : le serveur obtient lui-même un `access_token` via `client_id` + `client_secret` (variables d'env), le met en cache et le renouvelle. Les autres flows OAuth (authorizationCode, implicit, password) et OpenID Connect sont **acceptés** mais traités comme du **Bearer** (jeton fourni par l'utilisateur/l'agent — relai ou env).

## Décisions cadre (déjà tranchées)

- **D-OAuth-1** : flow supporté en auto = **`client_credentials` uniquement**. `authorization_code` (login navigateur) → phase ultérieure.
- **D-OAuth-2** : **SLICE Cloud ne stocke jamais de secret.** Le flow auto (obtention de token) est **réservé au self-host** (secrets dans l'env du MCP de l'utilisateur). En **mode hébergé/relai**, OAuth2 = relai d'un `Bearer` fourni par l'agent (pas d'appel `tokenUrl` côté cloud).
- **D-OAuth-3** : authentification au `tokenUrl` via **`client_secret_basic`** (`Authorization: Basic base64(id:secret)`) — c'est le MUST de RFC 6749 §2.3.1 (tout serveur conforme le supporte). Fallback `client_secret_post` non inclus en phase 1 (tracé si une API réelle l'exige).
- **D-OAuth-4** : Basic/Digest amont restent **rejetés** (`UNSUPPORTED_AUTH`) — hors scope.
- **D-OAuth-5** (lève la contradiction soulevée en revue) : le flow auto (`oauth-token`, obtention du token) vit **uniquement dans le kit généré self-host/local** (templates). Le **runtime hébergé** SLICE Cloud (`hosted-mcp-factory`, route `/m/:id`) n'utilise jamais le kit : il **relaie** seulement (R21-R22) et n'appelle jamais `tokenUrl`. Donc aucun secret côté cloud — D-OAuth-2 tenu. Le secret OAuth en mode auto reste sur le serveur de l'utilisateur (env), sous sa responsabilité.
- **D-OAuth-6** (SSRF) : le kit self-host fait `POST tokenUrl` **sans guard SSRF** — c'est la frontière de confiance du self-host (l'utilisateur exécute son propre serveur, comme pour `BASE_URL`). Tracé, accepté. Côté cloud, aucune surface : la factory n'appelle jamais `tokenUrl` (D-OAuth-5). `tokenUrl` doit être **absolu https** après résolution (R2/R9).
- **D-OAuth-7** (encodage) : le body du POST token est construit via `URLSearchParams` (encode scopes/caractères spéciaux) ; le base64 du header Basic via `Buffer.from(id+':'+secret).toString('base64')` (jamais `btoa`, qui casse sur l'UTF-8).
- **D-OAuth-8** (réponse token) : `expires_in` absent → TTL de repli **300 s**. `token_type` présent et ≠ `bearer` (insensible à la casse) → **erreur** (on n'émet que des Bearer). `token_type` absent → supposé Bearer.

## Modèle de données

`UpstreamAuthType` (src/shared/types.ts) gagne `'oauth2'`. Variant :

```ts
| { type: 'oauth2'; tokenUrl: string; scopes?: string[] }
```

`tokenUrl` est toujours une **URL absolue https** après normalisation. `scopes` = liste éventuellement vide.

**Propagation (corrige B1 de la revue)** : le couple `tokenUrl/scopes` doit transiter par toute la chaîne, pas seulement `types.ts`/`config-schema.ts`. Fichiers porteurs à étendre :
- `auth-detector.ts` — `DetectedAuth` gagne `tokenUrl?`/`scopes?` (aujourd'hui `headerName?` seul).
- `spec-normalizer.ts` — propage `tokenUrl/scopes` (ne copie aujourd'hui que `headerName`).
- `spec-to-hosted-config.ts` — copie le variant vers la `HostedMcpConfig` (la factory ignore `tokenUrl/scopes` mais le type doit rester cohérent).

## Règles métier (testables)

### A. Détection / parsing (`auth-detector.ts`, `parser.ts`)

- **R1** — Spec dont un securityScheme **référencé** est `type:'oauth2'` avec `flows.clientCredentials.tokenUrl` non vide → détectée `{type:'oauth2', tokenUrl, scopes}`. Test : spec clientCredentials → `detectAuth` renvoie ce variant avec le bon tokenUrl + scopes.
- **R2** — `tokenUrl` relatif (ex. `/oauth/token`) → résolu en absolu contre `servers[0].url` (à défaut `baseUrl` détecté). Test : tokenUrl relatif → sortie absolue correcte. Cas erreur : aucune base résolvable → fallback `bearer` (R5).
- **R3** — Spec `oauth2` **sans** `clientCredentials` (authorizationCode/implicit/password) → détectée `{type:'bearer'}` (acceptée, plus de rejet). Test : spec authorizationCode-only → `bearer`.
- **R4** — `type:'openIdConnect'` → `{type:'bearer'}` (accepté). Test : spec OIDC → `bearer`.
- **R5** — `oauth2` avec `clientCredentials` mais `tokenUrl` vide/absent → `{type:'bearer'}` (impossible d'auto-obtenir sans tokenUrl). Test.
- **R6** — Basic/Digest seuls référencés → reste `UNSUPPORTED_AUTH` (inchangé). Test : non-régression `parser.test.ts:354-388`.
- **R7** — Priorité quand plusieurs schémas supportés référencés : **oauth2(clientCredentials) > bearer > apiKey(header) > apiKey(query) > none**. Test : spec mêlant oauth2-cc + bearer → oauth2 gagne. Non-régression : bearer > apiKey conservé.
- **R7bis** (corrige B2) — `detectAuth` doit itérer sur les **schémas référencés** (root `security` + `security` des opérations), comme `assertSupportedAuth`, et **non** sur tous les `securitySchemes` déclarés. Sinon un oauth2 déclaré mais non utilisé serait imposé à tort. Aligner les deux passes sur le même ensemble de schémas référencés (factoriser si possible). Test : spec avec oauth2 **déclaré non référencé** + bearer référencé → détecté `bearer`.
- **R8** (clarifie I5) — `parser.assertSupportedAuth` traite **tout** schéma `oauth2` (quel que soit le flow) **et** `openIdConnect` comme **supporté** (plus jamais `UNSUPPORTED_AUTH` à cause d'eux). Conséquence : un endpoint `[oauth2, basic]` (OR) ne fail plus. `UNSUPPORTED_AUTH` ne subsiste que si **tous** les schémas référencés sont basic/digest (R6). Test R8 sur les 3 variantes : oauth2-clientCredentials-only, oauth2-authorizationCode-only, oidc-only → parse OK.

### B. Validation config (`config-schema.ts`)

- **R9** — `upstreamAuthSchema` accepte `{type:'oauth2', tokenUrl, scopes?}`. `tokenUrl` validé URL absolue `https://` (rejette vide, relatif, non-https). `scopes` optionnel = array de strings. Test : variant valide accepté ; tokenUrl manquant/non-https rejeté.

### C. Code généré — self-host, mode `env` (`http-client.ts.hbs`, `oauth-token.ts.hbs` nouveau, `env.example.hbs`)

L'init OAuth (validation env, R10) se fait en **top-level de `http-client.ts.hbs`** (comme les checks existants apiKey/bearer lignes 16-37), **pas** dans `index.ts.hbs` (qui n'a aucune branche auth — corrige C4 de la revue).

- **R10** — Pour `type:'oauth2'` en `MCP_AUTH_MODE=env`, le code lit `UPSTREAM_OAUTH_CLIENT_ID` + `UPSTREAM_OAUTH_CLIENT_SECRET`. Absents → erreur claire (`UPSTREAM_OAUTH_CLIENT_ID/SECRET are required for this MCP.`) avant le 1ᵉʳ appel. Test (runtime tsx) : env vides → erreur explicite.
- **R11** — Obtention du token : `POST <tokenUrl>`, `Content-Type: application/x-www-form-urlencoded`, header `Authorization: Basic <base64>` (base64 via `Buffer.from`, D-OAuth-7), body construit via **`URLSearchParams`** : `grant_type=client_credentials` (+ `scope=<scopes joints par espace>` si scopes non vide). Test : serveur token mocké reçoit méthode/headers/body corrects (scopes encodés) et renvoie `{access_token, expires_in}`.
- **R12** — L'`access_token` obtenu est attaché aux appels upstream en `Authorization: Bearer <token>`. Test : l'upstream mocké reçoit le bearer obtenu.
- **R13** — Cache : tant que non expiré, le token est réutilisé sans nouvel appel `tokenUrl`. Refresh proactif avec **marge 30 s** avant `expires_in`. `expires_in` absent → TTL de repli **300 s** (D-OAuth-8). Test : 2 appels rapprochés → 1 seul POST tokenUrl ; après expiry simulée → nouveau POST ; réponse sans `expires_in` → re-fetch après ~300 s.
- **R14** — Concurrence : N appels simultanés avec cache vide → **un seul** POST tokenUrl (in-flight promise partagée). Test : 3 appels parallèles → 1 POST tokenUrl.
- **R15** — Retry 401 : si un appel upstream renvoie 401, le cache token est invalidé, le token re-obtenu **une fois**, l'appel rejoué. 2ᵉ 401 → erreur remontée (pas de boucle). Test : upstream 401 puis 200 → succès après 1 refresh ; 401 deux fois → erreur.
- **R16** — Échec d'obtention : `POST tokenUrl` non-2xx → erreur typée claire (`Failed to obtain OAuth token: <status>`). Test.
- **R16bis** (token_type, D-OAuth-8) — réponse token avec `token_type` présent et ≠ `bearer` (insensible casse) → erreur. `token_type` absent → supposé Bearer. Test.
- **R17** — Le `client_secret` n'apparaît **jamais en clair** dans aucun fichier généré (uniquement lu via `process.env`). Test : aucun fichier généré ne contient la valeur du secret ; `oauth-token.ts` lit `process.env.UPSTREAM_OAUTH_CLIENT_SECRET`.
- **R17bis** (non-fuite, I2) — ni le `client_secret`, ni le header `Authorization: Basic <base64>`, ni le **body de la réponse `tokenUrl`** ne sont inclus dans un message d'erreur ou un log. Les erreurs ne portent que le statut HTTP. Test : forcer une erreur token et vérifier que le secret (et son base64) n'apparaissent pas dans le message.
- **R18** — `.env.example` généré documente `UPSTREAM_OAUTH_CLIENT_ID=` + `UPSTREAM_OAUTH_CLIENT_SECRET=` + le `tokenUrl` (+ scopes) en commentaire, pour `type:'oauth2'`. Test snapshot.
- **R19** — Le bundle généré pour une spec oauth2 **type-checke** (`tsc --noEmit`). Test : étendre `mcp-generator.snapshot.test.ts` avec un cas oauth2.
- **R19bis** (test http vs https, I3) — la validation `tokenUrl https://` (R9) doit autoriser un échappatoire pour les tests runtime (qui utilisent `http://127.0.0.1`), aligné sur le mécanisme `allowPrivateHosts` existant. Spécifié pour que R11-R16 soient testables sans serveur https.

### D. Mode relai — hébergé & self-host `relay` (`http-client.ts.hbs`, `hosted-mcp-factory.ts`)

- **R20** (clarifie I6) — En `MCP_AUTH_MODE=relay`, pour `type:'oauth2'`, le code généré relaie `Authorization: Bearer <relayedToken()>`, **sans** appeler `tokenUrl`. C'est une **branche Handlebars `oauth2` distincte** (pas un ré-emploi de la branche bearer) : elle importe `relayedToken` mais **ne lit pas** `UPSTREAM_BEARER_TOKEN` et, en mode `env`, délègue à `oauth-token` au lieu d'un token statique. Veiller à ce qu'aucun import ne reste inutilisé (sinon `tsc --noEmit` R19 casse). Test (runtime relai) : token de l'agent relayé tel quel ; aucun POST tokenUrl.
- **R21** — Runtime hébergé `callUpstream` : pour `type:'oauth2'`, injecte le token relayé en `Authorization: Bearer` (réutilise la branche bearer). Test : `hosted-mcp-factory.test.ts` cas oauth2.
- **R22** — `hosted-mcp-factory` n'effectue **jamais** d'appel `tokenUrl` et ne lit jamais de `client_secret` (D-OAuth-2). Test : aucune requête sortante autre que l'appel upstream relayé.

### E. UI config (`config.tsx`, `auth-option.tsx`)

- **R23** — OAuth2 détecté → affiché en lecture seule, libellé humain « Automatic connection (OAuth 2.0) », avec le `tokenUrl` montré. Pas de jargon flow. Test composant (rendu + libellé).
- **R24** — (self-host) un encart indique que `UPSTREAM_OAUTH_CLIENT_ID/SECRET` seront à renseigner dans l'environnement du serveur (cohérent avec `.env.example`). (UAT visuel — pas de règle auto bloquante.)

### F. Validation réelle (corpus)

- **R25** — `corpus-check` : les specs oauth2-clientCredentials passent désormais en `ok` (génération + Zod construisent), plus en `reject:UNSUPPORTED_AUTH`. Mesurer le delta de couverture (avant/après) et le tracer. (UAT / non bloquant CI.)

## Cas limites & erreurs (récapitulatif)

| Cas | Comportement attendu | Règle |
|-----|----------------------|-------|
| tokenUrl relatif | résolu absolu vs servers[0] | R2 |
| oauth2 sans clientCredentials | → bearer (accepté) | R3 |
| OIDC | → bearer (accepté) | R4 |
| clientCredentials sans tokenUrl | → bearer | R5 |
| basic/digest seuls | UNSUPPORTED_AUTH | R6 |
| client_id/secret manquants (env) | erreur claire avant appel | R10 |
| token POST échoue | erreur typée, pas de fuite secret | R16 |
| upstream 401 | refresh 1×, rejoue ; 2ᵉ 401 → erreur | R15 |
| N appels parallèles, cache vide | 1 seul POST tokenUrl | R14 |
| token expiré (marge 30s) | re-obtention | R13 |
| mode hébergé/relai | relai bearer, jamais tokenUrl/secret | R20-R22 |

## SPEC visuelle (légère — UI)

Écran de configuration, bloc « Authentication to the API » :

```
┌─ Authentication to the API ───────────────────────────┐
│  ✓ Auto-detected                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🔒 Automatic connection (OAuth 2.0)               │ │
│  │ The server signs in by itself using a client ID   │ │
│  │ and secret you provide in its environment.        │ │
│  │ Token endpoint: https://api.example.com/oauth/tok │ │
│  └──────────────────────────────────────────────────┘ │
│  ℹ When self-hosting, set UPSTREAM_OAUTH_CLIENT_ID and │
│    UPSTREAM_OAUTH_CLIENT_SECRET in the server's env.   │
└────────────────────────────────────────────────────────┘
```

États : Default (détecté, lecture seule). Pas de Loading/Empty/Error spécifiques (auth dérivée du parsing). Responsive : encart pleine largeur, wrap du tokenUrl. A11y : libellé textuel (pas seulement l'icône), contraste conforme au thème existant.

## Hors scope (cette phase)

- `authorization_code` / login navigateur, gestion de `refresh_token` utilisateur.
- `client_secret_post`, private_key_jwt, mTLS.
- Obtention de token côté SLICE Cloud (jamais — D-OAuth-2).
- RFC 8707 `resource`/`audience` indicators.
- Multi-scheme par endpoint (on prend le plus prioritaire — R7).

## Fichiers impactés (consolidé après revue)

| Fichier | Changement |
|---------|-----------|
| `src/shared/types.ts` | variant `oauth2` dans `UpstreamAuthType`/`UpstreamAuth` |
| `src/shared/config-schema.ts` | variant Zod oauth2 (R9) |
| `src/server/services/auth-detector.ts` | `DetectedAuth` + tokenUrl/scopes ; détection oauth2 ; itération sur schémas référencés (R1-R5, R7, R7bis) |
| `src/server/services/parser.ts` | `assertSupportedAuth` accepte oauth2/oidc (R6, R8) |
| `src/server/services/spec-normalizer.ts` | propage tokenUrl/scopes (B1) |
| `src/server/services/spec-to-hosted-config.ts` | copie le variant vers HostedMcpConfig (B1) |
| `src/server/templates/oauth-token.ts.hbs` | **nouveau** — obtention/cache/refresh/retry token (R11-R16bis) |
| `src/server/templates/http-client.ts.hbs` | branche oauth2 env + relay (R10, R12, R20) |
| `src/server/templates/env.example.hbs` | vars OAuth (R18) |
| `src/server/services/hosted-mcp-factory.ts` | branche oauth2 = relai bearer (R21-R22) |
| `src/client/screens/config.tsx`, `auth-option.tsx` | affichage lecture seule (R23-R24) |
| `scripts/corpus-check.ts` | mesure couverture (R25) |
| tests associés | parser/detector/config-schema/relay/snapshot/factory |

## Découpage proposé (pour REFINE) — la phase est ~12 fichiers, à scinder

Ordre par dépendance (1a → {1b puis 1c} → 1d) :

- **OAuth-1a — Détection & acceptation (backend, pas de codegen).** types, config-schema (R9), auth-detector (R1-R5, R7, R7bis), parser (R6, R8), spec-normalizer (B1). Tests unitaires R1-R9. *Livrable : les specs oauth2 ne sont plus rejetées, le variant transite jusqu'à la config.*
- **OAuth-1b — Flow client_credentials self-host (cœur risqué).** `oauth-token.ts.hbs` (R11-R16bis : cache/concurrence/retry/non-leak), branche oauth2 env dans http-client (R10, R12, R17, R17bis), env.example (R18). Tests runtime `tsx` + double mock (token + upstream) + snapshot typecheck (R19, R19bis).
- **OAuth-1c — Relai (hébergé + self-host relay).** branche oauth2 relay http-client (R20), hosted-mcp-factory (R21-R22), spec-to-hosted-config. Tests relay runtime + factory + « aucun POST tokenUrl » (R22).
- **OAuth-1d — UI lecture seule + corpus.** config.tsx, auth-option.tsx (R23-R24), corpus-check (R25) + UAT.

1b et 1c partagent `http-client.ts.hbs` → **sérialiser** (1b puis 1c) pour éviter le conflit de branches Handlebars.

## Spike ORIENT — ciblé sur le harness de test 1b

Le *pattern* cache/in-flight/retry est connu, mais le **harness de test ne l'est pas** : les tests relai existants ne lancent qu'**un** upstream mocké, alors que R11-R15 exigent **deux** serveurs mockés (token + upstream) + injection d'un `expires_in` court + comptage des POST tokenUrl à travers le transport MCP. **Spike léger (~0,5 j) recommandé** : valider le double-mock et la mesure du nombre de POST sur 1 cas, avant d'écrire les tests TDD de 1b. Résolution `tokenUrl` relatif (R2) : pas de spike, 1-2 fixtures réelles suffisent.
