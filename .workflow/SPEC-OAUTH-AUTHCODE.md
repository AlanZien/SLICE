# SPEC — OAuth2 `authorization_code` (browser login)

*Phase : oauth-authcode — FORGE niveau Complexe*

## Périmètre

Supporter les APIs protégées par un flow OAuth2 `authorization_code` (GitHub, Google, Slack, Notion OAuth, etc.) dans le **kit self-host téléchargé**. Quand le MCP généré tourne localement, il ouvre le navigateur de l'utilisateur, capte le callback sur localhost, échange le code contre des tokens, et les réutilise automatiquement (refresh inclus).

Le mode **hébergé (SLICE Cloud)** n'est PAS concerné — le runtime sur serveur ne peut pas ouvrir un navigateur. Pour ce mode, `authorization_code` continue d'être traité comme `bearer` (l'utilisateur fournit son token manuellement).

---

## Décisions de design (arbitrées ici, pas de ORIENT nécessaire)

| Question | Décision | Raison |
|---|---|---|
| Ouvrir le navigateur | package `open` (cross-platform, 0 dépendance native) | Standard de facto dans l'écosystème Node |
| Callback server | `node:http` sur port configurable (défaut 8788), 3 tentatives de port si occupé | Pas de dépendance ajoutée |
| PKCE | S256 obligatoire, jamais `plain` | Bonne pratique pour clients publics sur localhost |
| Token storage | `~/.slice-tokens-<mcpName>.json` | Simple, portable, pas de keychain (outil dev) |
| `clientId` / `clientSecret` | Env vars uniquement (`UPSTREAM_OAUTH_CLIENT_ID`, `UPSTREAM_OAUTH_CLIENT_SECRET`) — pas de saisie dans l'UI SLICE | Cohérent avec le flow CC existant |
| Priorité CC vs authcode | `client_credentials` garde la priorité si les deux flows sont présents | Machine-to-machine préféré |
| `client_secret_post` | Hors scope — on garde `client_secret_basic` comme pour CC | Simplification MVP |

---

## R — Règles métier

### Groupe 1 — Détection (`auth-detector.ts`)

**R1** : Une spec avec `flows.authorizationCode.authorizationUrl` ET `flows.authorizationCode.tokenUrl` → détectée comme `{ type: 'oauth2', flow: 'authorization_code', authorizationUrl, tokenUrl, scopes }`. Les URLs relatives sont résolues en absolues depuis `baseUrl` (même mécanique que `tokenUrl` pour CC).

**R2** : Si un scheme oauth2 possède à la fois `clientCredentials` (avec tokenUrl) et `authorizationCode` → `client_credentials` garde la priorité (inchangé).

**R3** : `authorizationCode` sans `authorizationUrl` ou sans `tokenUrl` → fallback `{ type: 'bearer' }` (inchangé).

**R4** : `openIdConnect` → fallback `{ type: 'bearer' }` (inchangé).

**R5** : Les specs déjà gérées (CC, bearer, apiKey, none) continuent à produire exactement le même résultat qu'avant.

### Groupe 2 — Types partagés (`shared/types.ts` + `config-schema.ts`)

**R6** : `UpstreamAuth` expose un champ `flow?: 'client_credentials' | 'authorization_code'` et `authorizationUrl?: string`. L'absence de `flow` sur un `type: 'oauth2'` signifie `client_credentials` (compatibilité ascendante).

**R7** : Le schéma Zod `upstreamAuthSchema` étend la branche `oauth2` avec `flow`, `authorizationUrl` (optionnel), en maintenant les validations anti-injection existantes (`SAFE_TOKEN_URL`, `SAFE_SCOPE`) appliquées aussi à `authorizationUrl`.

**R8** : `authorizationUrl` est validée : `https://` uniquement, pas de caractères breakout (même regex `SAFE_TOKEN_URL`).

### Groupe 3 — Kit self-host généré (`mcp-generator.ts` + templates)

**R9** : Si `upstreamAuth.type === 'oauth2'` et `flow === 'authorization_code'` → le générateur émet `src/oauth-authcode.ts` (nouveau template) **à la place** de `src/oauth-token.ts`.

**R10** : `oauth-authcode.ts` expose la même interface que `oauth-token.ts` : `getAccessToken(): Promise<string>` et `invalidateToken(): void`. Le reste du kit (`http-client.ts`, `index.ts`) n'a pas besoin de changer.

**R11 — Flow complet au premier appel sans token valide** :
- R11a : Génère un `state` (32 bytes aléatoires, hex) et un `code_verifier` (64 bytes aléatoires, base64url sans padding).
- R11b : Calcule `code_challenge = base64url(SHA256(code_verifier))` (S256).
- R11c : Lance un serveur HTTP sur `CALLBACK_PORT` (env `UPSTREAM_OAUTH_CALLBACK_PORT`, défaut `8788`). Si le port est occupé, essaie `8789` puis `8790`. Si les 3 sont occupés → erreur `Cannot start callback server (ports 8788-8790 all in use)`.
- R11d : Construit l'URL d'autorisation : `authorizationUrl + ?client_id=...&redirect_uri=...&response_type=code&scope=...&state=...&code_challenge=...&code_challenge_method=S256`.
- R11e : Ouvre le navigateur via `open`. Si `open` échoue ou env headless → affiche l'URL complète sur `process.stderr` : `Open this URL in your browser to authenticate: <url>` (fallback SSH/CI).
- R11f : Attend le callback sur `/callback` — timeout 120s. Si dépassé → erreur `OAuth browser flow timed out after 120s. Restart the MCP to retry.`
- R11g : Vérifie `state`. Si mismatch → erreur `OAuth state mismatch — possible CSRF. Restart the MCP to retry.`
- R11h : Si le provider renvoie `?error=...` dans le callback → erreur `OAuth provider error: ${error_description ?? error}`.
- R11i : Échange le code : POST `tokenUrl` avec `grant_type=authorization_code`, `code`, `redirect_uri`, `code_verifier`, `client_id`, et `client_secret` (si `UPSTREAM_OAUTH_CLIENT_SECRET` est défini — via `client_secret_basic` dans l'header `Authorization: Basic`). Si non-2xx → erreur `OAuth token exchange failed: ${status}`.
- R11j : Ferme le serveur callback immédiatement après le premier callback reçu (ou au timeout).
- R11k : Stocke `access_token`, `refresh_token`, `expires_at` dans `~/.slice-tokens-<mcpName>.json`. Crée le fichier s'il n'existe pas.

**R11l** : Si le fichier `~/.slice-tokens-<mcpName>.json` existe mais est corrompu (JSON invalide) → le traiter comme "pas de token", supprimer le fichier, relancer le flow.

**R12** : Token valide en cache (fichier lu au démarrage + mémoire) → `getAccessToken()` le retourne directement.

**R13** : Token expiré + `refresh_token` présent → refresh automatique : POST `tokenUrl` avec `grant_type=refresh_token`, `refresh_token`, `client_id` (+ `client_secret` si présent). Si 2xx → met à jour le fichier. Si non-2xx → invalide le fichier et relance le flow navigateur (R11).

**R14** : `invalidateToken()` efface l'entrée en mémoire et supprime le fichier de tokens (relance le flow au prochain appel).

**R15** : Le `clientId` est lu exclusivement depuis `process.env.UPSTREAM_OAUTH_CLIENT_ID`. Le `clientSecret` depuis `process.env.UPSTREAM_OAUTH_CLIENT_SECRET` (optionnel — certains providers public ne l'exigent pas). Si `clientId` absent → erreur explicite au démarrage du flow.

**R16** : Toutes les valeurs issues du template (authorizationUrl, tokenUrl, scopes) sont injectées via `JSON.stringify` — règle anti-injection promue dans `01-conventions.md`.

### Groupe 4 — `.env.example` généré

**R17** : Pour `authorization_code`, le `.env.example` inclut :
```
UPSTREAM_OAUTH_CLIENT_ID=your-client-id
UPSTREAM_OAUTH_CLIENT_SECRET=your-client-secret   # optional for public clients
UPSTREAM_OAUTH_CALLBACK_PORT=8788                 # optional, default 8788
```

### Groupe 5 — Config screen UI (screen 3)

**R18** : Si `upstreamAuth.flow === 'authorization_code'` → l'écran 3 affiche un bloc "Browser Auth (OAuth2)" avec :
- URL d'autorisation détectée (read-only, affichée pour information)
- URL du token détectée (read-only)
- Scopes détectés (liste, read-only)
- Mention : *"When the MCP starts for the first time, it will open your browser to complete login. Tokens are cached in `~/.slice-tokens-<name>.json`."*
- Env vars à renseigner : `UPSTREAM_OAUTH_CLIENT_ID` (required), `UPSTREAM_OAUTH_CLIENT_SECRET` (optional)
- Callback URL (read-only) : `http://localhost:8788/callback`

**R19** : Le bloc "Browser Auth" n'apparaît PAS pour `client_credentials` (inchangé) ni pour le mode cloud.

### Groupe 6 — Mode hébergé (SLICE Cloud) — inchangé

**R20** : `hosted-mcp-factory.ts` traite `authorization_code` exactement comme `bearer` — le runtime relaie le token de l'appelant. Aucun changement dans ce chemin.

---

## Cas d'erreur (testables)

| Code | Déclencheur | Message attendu |
|---|---|---|
| E1 | Timeout 120s | `OAuth browser flow timed out after 120s. Restart the MCP to retry.` |
| E2 | State mismatch | `OAuth state mismatch — possible CSRF. Restart the MCP to retry.` |
| E3 | Provider renvoie `?error=access_denied` | `OAuth provider error: access_denied` |
| E4 | Token exchange non-2xx | `OAuth token exchange failed: 400` |
| E5 | Ports 8788-8790 occupés | `Cannot start callback server (ports 8788-8790 all in use)` |
| E6 | `CLIENT_ID` absent | `UPSTREAM_OAUTH_CLIENT_ID is required for this MCP.` |
| E7 | Refresh échoue | invalide le token + relance le flow navigateur |

---

## Hors scope (cette phase)

- OIDC discovery (`.well-known/openid-configuration`)
- `client_secret_post` (on garde `client_secret_basic`)
- SLICE Cloud authcode (flux navigateur côté serveur)
- UI de révocation / logout
- Refresh token rotation (nouveau RT à chaque refresh)
- `implicit` et `password` flows
- Support multi-compte (un seul jeu de tokens par `mcpName`)

---

## Fichiers impactés (estimation)

| Fichier | Nature du changement |
|---|---|
| `src/shared/types.ts` | `UpstreamAuth` + `flow` + `authorizationUrl` |
| `src/shared/config-schema.ts` | Branche `oauth2` étendue (flow, authorizationUrl) |
| `src/server/services/auth-detector.ts` | Détection `authorizationCode` dans `oauth2FromScheme` |
| `src/server/services/mcp-generator.ts` | Branche authcode → émet `oauth-authcode.ts` |
| `src/server/templates/oauth-authcode.ts.hbs` | Nouveau template (flow navigateur + PKCE + fichier tokens) |
| `src/server/templates/env.example.hbs` | Variables authcode |
| `src/client/hooks/use-config.ts` | Pré-remplissage config authcode |
| `src/client/components/ConfigScreen` | Bloc "Browser Auth" conditionnel |

---

## Critères d'acceptation (Definition of Done)

- [ ] Un test auth-detector : spec avec `authorizationCode` → `flow: 'authorization_code'`
- [ ] Un test auth-detector : spec avec CC + authcode → CC gagne
- [ ] Un test auth-detector : authcode sans tokenUrl → `bearer`
- [ ] Tests unitaires `oauth-authcode` : getAccessToken (cache, refresh, re-flow)
- [ ] Test E2E : kit généré en authcode → flow complet (serveur callback mock + upstream mock) via tsx
- [ ] Snapshot test : bundle authcode contient `oauth-authcode.ts`, pas `oauth-token.ts`
- [ ] Corpus check : 0 régression sur les specs CC/bearer/apiKey existantes
- [ ] Tests use-theme (5 rouge actuellement) : non touchés, restent en l'état
