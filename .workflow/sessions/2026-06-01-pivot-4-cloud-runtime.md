# Session 2026-06-01 — Pivot-4 : runtime MCP hébergé (SLICE Cloud)

Reprise après crash de l'app. État de départ : backend Pivot-4 fait (tâches 1-5), il restait la tâche 6 (front).

## Phases parcourues (cycle FORGE complet)

- **GENERATE (tâche 6 — front SLICE Cloud)**, en TDD strict :
  - `apiHost` client (`POST /api/host`), snippets mode URL (RC5.3, placeholder `COLLE_TON_TOKEN_ICI`),
    `ConnectionTabs` mode hosted (3 onglets actifs), `SuccessScreen` branche hosted (URL live),
    `App.tsx` route `hosting === 'cloud'` → `/api/host`.
- **EVALUATE CRITIQUE** (auth/relai/contrôle d'accès) :
  - `/security-review` → **SSRF / open-proxy** : `POST /api/host` (anonyme) acceptait n'importe quel
    `baseUrl`, fetché côté serveur SLICE → lecture possible de `169.254.169.254`, services internes.
    **Corrigé** : `ssrf-guard.ts` (loopback/privé/link-local/metadata + IPv4-mapped IPv6), à la création
    (`400 BLOCKED_HOST`) et au runtime. `allowPrivateHosts` off en prod.
  - `/simplify` (fan-out 4 agents) → dédups appliquées (`reparseAndSelect`, `throwApiError`),
    suppression d'un test demo écrivant dans `~/Desktop`. Skip justifié de la simplif `buildZodSchema`
    (branches array/object pas mortes).
- **DELIVER** → PR #20 (mergée). UAT.md mis à jour.
- **LEARN** → PR #21 (mergée) : REVIEW.md + règle promue dans `03-testing.md`.

## Découvert en testant pour de vrai (UAT bout-en-bout)

Validation manuelle contre la **vraie API Notion**, d'abord en CLI (`scripts/try-hosted.ts`) puis
**dans Claude Desktop** (via `supergateway`) :

- **Bug trouvé hors tests unitaires** : les params `in:'header'` (`Notion-Version`, requis par Notion)
  étaient parsés, exposés à l'agent, puis **jetés** par `callUpstream` (path+query seulement).
  Corrigé (forward des headers, auth relay prioritaire). → a déclenché la règle LEARN.
- **Limites produit confirmées** : pas de forwarding du **body** → écritures et **recherche Notion** KO.
  Le snippet `url+headers` généré ne se colle pas dans Claude Desktop (il faut `supergateway`/`mcp-remote`).
- **Preuve** : `list_all_users` via `slice-notion` dans Claude → vrais utilisateurs du workspace
  « Notion de GiveMe5 ». Le modèle « URL + token relayé » tient en conditions réelles.

## Décisions

- Guard SSRF à deux niveaux ; DNS-rebinding laissé en dette explicite (pinning d'IP = dispatcher undici custom).
- Header forwarding ajouté au runtime mais pas au template du kit → divergence « même MCP des deux côtés »
  assumée et tracée.
- `scripts/try-hosted.ts` gardé comme outil de dev (lit le token depuis env, aucun secret en dur).

## État du repo en fin de session

- `main` à jour : Pivots 1-4 mergés (PR #20, #21). 414 tests verts, typecheck strict clean.
- Store hébergé **in-memory** (URL meurt au restart) — persistance = dette.
- Serveur `pnpm dev` **arrêté** en fin de session.

## Prochaine étape (recommandée)

**Forwarding du body de requête** (`in:'body'`) — plus forte valeur produit (débloque écritures +
recherche Notion). Touche le **parser** (flatten `requestBody`), le **runtime hébergé** et le **kit généré**.
Nouvelle phase FORGE (SPEC courte → REFINE → GENERATE). Cf. `BACKLOG.md` § « Runtime hébergé — suites Pivot-4 ».

## Housekeeping en suspens (côté utilisateur)

- Branches `feature/pivot-4-hosted-runtime` + `docs/learn-pivot-4` encore sur le remote (mergées) → à supprimer.
- Jeton Notion exposé dans le chat → à révoquer.
- Entrée `slice-notion` dans la config Claude Desktop (ajoutée cette session, backup `.bak-*` créé) →
  pointe vers un serveur arrêté ; à retirer ou re-pointer après relance de `pnpm dev`.
