# Plan : Phase Pivot-3 — Mode relai d'auth

Date : 2026-05-31
SPEC : .workflow/SPEC-CLOUD.md (RC2)
Statut : DRAFT

## Objectif

Le MCP généré sait, en mode `relay`, **relayer le header `Authorization` de chaque requête entrante** vers l'API cible — sans jamais stocker de secret — pour rendre l'hébergement SLICE Cloud (Pivot-4) possible sans détenir les tokens des utilisateurs.

## Conception (décisions de cette phase)

- **Switch runtime, pas de génération conditionnelle** : `MCP_AUTH_MODE` ∈ { `env` (défaut), `relay` } est lu **à l'exécution**. Le **même bundle** sert le self-host (`env`) et le cloud (`relay`). Cohérent avec « un seul artefact ».
- **Threading via `AsyncLocalStorage`** (OQ-3) : en mode relay, le serveur HTTP capture `req.headers.authorization` et exécute `transport.handleRequest` à l'intérieur d'un `authStore.run({ authorization }, …)`. Le `http-client` lit ce contexte par requête → aucune signature de tool à changer. C'est le mécanisme Node idiomatique pour un contexte requête-scopé.
- **Nouveau module généré `src/auth-context.ts`** : porte l'`AsyncLocalStorage` partagé + un helper `relayedToken()` qui extrait la valeur d'un `Authorization: Bearer <x>` bien formé (RC2.7 : insensible à la casse, non vide, sinon `undefined`).
- **Contrôle d'accès** : en mode `relay`, l'accès au MCP est protégé par l'URL non-devinable (Pivot-4, côté Coolify) — le MCP **ne valide pas** de token descendant (le header entrant EST le credential amont). En mode `env`, on garde la vérification `Bearer MCP_SERVER_TOKEN` actuelle.

## Risque & de-risking (OQ-3)

Le seul inconnu : `AsyncLocalStorage` survit-il à la traversée `transport.handleRequest` → handler du tool → `call()` du MCP SDK ? **On le valide en premier** via le test d'intégration runtime (Tâche 1, qui tient lieu de spike TDD). S'il échoue, fallback : instancier un serveur/transport **par requête** (mode stateless du SDK) capturant le token en closure. On ne construit les templates qu'une fois le threading prouvé.

## Fichiers impactés

- [ ] `src/server/templates/auth-context.ts.hbs` (nouveau) — `AsyncLocalStorage<{authorization:string}>` exporté + `relayedToken()`.
- [ ] `src/server/templates/http-client.ts.hbs` — lire `MCP_AUTH_MODE` ; en `relay` lire le token via `relayedToken()` et le placer selon le type d'auth amont (apiKey → header d'API key ; bearer → `Authorization: Bearer`) ; gater les checks boot `throw if !secret` sur `mode === 'env'` (RC2.3).
- [ ] `src/server/templates/index.ts.hbs` — HTTP server : branche `relay` (capture header + `authStore.run(...)`, pas de check descendant) vs `env` (check `MCP_SERVER_TOKEN` actuel) ; gater l'exigence de `MCP_SERVER_TOKEN` sur `env`.
- [ ] `src/server/services/mcp-generator.ts` — enregistrer `auth-context.ts.hbs` → `src/auth-context.ts`.
- [ ] `src/server/templates/env.example.hbs` — documenter `MCP_AUTH_MODE` (commentaire, défaut `env`).
- [ ] `src/server/services/mcp-generator.snapshot.test.ts` — file-list 11 → 12.

## Tâches

- [x] 1. **De-risk** : spike ALS validé (`relay-threading.test.ts`) → OQ-3 résolu, plan B écarté. Cf. SPIKE-LOG.
- [x] 2. Module `auth-context.ts.hbs` + `relayedToken()`.
- [x] 3. `http-client.ts.hbs` : branche relay + gate des checks boot.
- [x] 4. `index.ts.hbs` : branche relay (ALS) + gate `MCP_SERVER_TOKEN`.
- [x] 5. Enregistrer le template + snapshot (11 → 12).
- [x] 6. `env.example.hbs` : doc `MCP_AUTH_MODE`.

## Tests TDD (écrits EN PREMIER, RED → GREEN)

- [x] RC2.6 (**clé**) — runtime : MCP en `relay` + `Authorization: Bearer USERSECRET123` → l'upstream mocké reçoit l'API key = `USERSECRET123` — `mcp-generator.relay.test.ts` (lancé via `tsx`)
- [x] RC2.4/2.7 — runtime : header absent / mal formé (`Token …`) → aucun credential amont — `mcp-generator.relay.test.ts`
- [x] RC2.1/RC2.3 — `http-client.ts` lit `MCP_AUTH_MODE`, throw boot gaté sur `=== 'env'` — `mcp-generator.test.ts`
- [x] RC2.3 — `UPSTREAM_BASE_URL` reste requis — `mcp-generator.test.ts`
- [x] Structure — `src/auth-context.ts` émis (AsyncLocalStorage + relayedToken) — `mcp-generator.test.ts` + snapshot
- [x] Mécanisme — ALS traverse le SDK MCP — `relay-threading.test.ts` (régression permanente)

## Tests E2E

> La Tâche 1 EST l'E2E runtime (compile + run + mock upstream). Si son coût/flakiness dépasse le budget, repli documenté : garder les assertions de contenu + UAT manuel pour le relai réel (comme RC3.6).

## UAT (à remplir dans .workflow/UAT.md pendant DELIVER)

- Générer un MCP, le lancer en `MCP_AUTH_MODE=relay`, appeler un tool depuis un agent en passant son token API → l'appel amont réussit avec ce token.
- Lancer le même bundle en `MCP_AUTH_MODE=env` (défaut) → comportement self-host inchangé (token via `.env`).
- Vérifier qu'aucun log ne contient la valeur du header `Authorization` (RC2.5).

## Documentation

- [ ] README généré : ajouter une note « Hosted mode (relay) » expliquant que l'agent envoie son token API, relayé sans stockage. (Optionnel, peut être groupé avec Pivot-5.)

## Definition of Done

- [ ] Tous les tests TDD passent (GREEN), dont le test runtime relai
- [ ] `pnpm typecheck` strict clean (bundle généré compile via le smoke tsc)
- [ ] Suite complète verte (snapshot régénéré)
- [ ] EVALUATE **CRITIQUE** (le diff touche la gestion des secrets / l'auth) : /security-review + /review + /simplify
- [ ] Aucun secret loggé (RC2.5 vérifié)
- [ ] Code commité et PR créée sur `feature/pivot-3-auth-relay`
- [ ] UAT.md mis à jour

---
Généré par le workflow FORGE (phase REFINE — pivot SLICE Cloud). Validé par l'utilisateur avant GENERATE.
