# Plan : Phase Pivot-4 — Runtime MCP hébergé (SLICE Cloud)

Date : 2026-05-31
SPEC : .workflow/SPEC-CLOUD.md (RC4, **mécanisme de déploiement superseded par D003**)
Décision d'archi : .workflow/DECISIONS.md D003
Statut : IN_PROGRESS

## Objectif

SLICE héberge les MCP : un **runtime multi-tenant unique** sert n'importe quel MCP par URL (`/m/:id`), en instanciant le `McpServer` à la volée depuis une config stockée, et en relayant le token de l'agent. Le bouton « SLICE Cloud » range une config et renvoie une URL.

## Conception (D003)

- **Un seul moteur partagé** dans SLICE. Pas de conteneur par MCP. Coolify n'héberge que SLICE.
- Store `id → HostedMcpConfig` (la "fiche"). **In-memory d'abord** (puis KV/DB en durcissement).
- Route `/m/:id` : transport **par session** (corrige la limite mono-session du Pivot-3), wrap `relayStore.run({ authorization })`.
- Secrets **jamais stockés** (relai). Accès gardé par l'**id non-devinable** (CSPRNG ≥128 bits).

## Fichiers impactés

- [x] `src/server/services/hosted-mcp-factory.ts` — `buildHostedMcpServer(config)` + `relayStore`/`relayedToken` + Zod runtime + proxy. **FAIT.**
- [ ] `src/server/services/hosted-store.ts` (nouveau) — store `id → config` in-memory + génération d'id CSPRNG.
- [ ] `src/server/services/spec-to-hosted-config.ts` (nouveau) — distille `parsedSpec + selectedIds + config` → `HostedMcpConfig` (réutilise la sélection d'endpoints).
- [ ] `src/server/routes/host.ts` (nouveau) — `POST /api/host` : distille, range, renvoie `{ id, url }`.
- [ ] `src/server/routes/hosted-mcp.ts` (nouveau) — `ALL /m/:id` : lookup config, transport par session, sert le MCP en relai.
- [ ] `src/server/index.ts` — monter les deux routes.
- [ ] Front (écran config + résultat) — bouton « SLICE Cloud » appelle `/api/host`, affiche l'URL + snippet. *(dernier, après le back)*

## Tâches

- [x] 1. **Cœur** : `buildHostedMcpServer` + relai (factory). Prouvé en test runtime.
- [x] 2. Store in-memory `id → config` + id CSPRNG non-devinable.
- [x] 3. Distilleur `spec-to-hosted-config`.
- [x] 4. Route `/m/:id` montée sur Express — **stateless** (résout le multi-session du Pivot-3).
- [x] 5. `POST /api/host` (re-parse serveur + distille + range + URL).
- [ ] 6. Câblage front (bouton SLICE Cloud → URL + snippet). **← reste à faire pour la démo cliquable.**

## Tests TDD (RED → GREEN)

- [x] Factory : MCP construit depuis une config, tools exposés, appel proxifié + token relayé (substitution path param) — `hosted-mcp-factory.test.ts`
- [x] Store : `put` renvoie un id ≥22 chars url-safe ; `get(id)` rend la config ; id inconnu → undefined — `hosted-store.test.ts`
- [x] Distilleur : `parsedSpec + selectedIds` → config avec les bons endpoints (method/path/params), baseURL, auth — `spec-to-hosted-config.test.ts`
- [x] `/m/:id` E2E : héberger via `POST /api/host`, **2 agents en parallèle** se connectent à l'URL, appellent, l'upstream reçoit chaque appel + le token propre de chacun relayé — `hosted-mcp.test.ts`
- [x] `/m/:id` sur id inconnu → 404 — `hosted-mcp.test.ts`

## UAT (DELIVER)

- Lancer SLICE, faire le parcours, cliquer « SLICE Cloud » → obtenir une URL.
- Coller l'URL dans un agent → voir les tools, en appeler un avec son token → vraie réponse de l'API.

## Definition of Done

- [ ] Tous les tests TDD passent (dont l'E2E multi-session)
- [ ] `pnpm typecheck` clean, suite verte
- [ ] EVALUATE **CRITIQUE** (touche l'auth/le relai/le contrôle d'accès par URL) : /security-review + /simplify
- [ ] PR créée sur `feature/pivot-4-hosted-runtime`
- [ ] UAT.md mis à jour
- [ ] Note : déploiement réel de SLICE sur le VPS + persistance DB = durcissement, après cette tranche cliquable

---
Généré par le workflow FORGE (phases REFINE/GENERATE — pivot SLICE Cloud). D003 acte l'archi.
