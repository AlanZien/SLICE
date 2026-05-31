# REVIEW — Pivot-4 : Runtime MCP hébergé / SLICE Cloud

PR #20 (mergée). Branche `feature/pivot-4-hosted-runtime`. 414 tests verts, typecheck clean.

## Ce qui a bien fonctionné

- **TDD strict tenu** sur toute la phase (RED → GREEN → refactor), backend puis front, commits atomiques.
- **Le pivot D003 (runtime multi-tenant unique) tient** : un seul moteur sert N MCP par `/m/:id`, instanciés à la volée depuis une config. Pas de conteneur par MCP. Le stateless résout d'un coup le mono-session du Pivot-3.
- **EVALUATE CRITIQUE a payé** : la security-review a trouvé une vraie SSRF/open-proxy (relai serveur d'une `baseUrl` anonyme) — corrigée avant merge, pas après incident.
- **`/simplify` en fan-out 4 agents** a produit des dédups nettes (`reparseAndSelect`, `throwApiError`) et a correctement été *refusé* là où il se trompait (branches `array`/`object` de `buildZodSchema` pas mortes).

## Ce qui a été difficile / découvert en route

- **Le vrai trou n'était pas dans les 414 tests.** En testant pour de vrai contre l'API Notion (via Claude Desktop), on a vu que les params `in:'header'` (`Notion-Version`, requis par Notion) étaient parsés, exposés à l'agent… puis **jetés** par `callUpstream`. Aucun test unitaire ne le voyait. Corrigé en séance.
- **L'UAT a aussi révélé les limites produit** : pas de forwarding du body → écritures et recherche Notion KO ; le snippet `url+headers` généré ne se colle pas dans Claude Desktop (il faut `supergateway`/`mcp-remote`).
- **Scope élargi par la validation réelle** : la phase devait juste câbler le front (tâche 6), elle a fini par corriger 2 bugs runtime (SSRF, header-forward) et valider bout-en-bout dans Claude. Bon investissement, mais à acter : « tranche cliquable » a sous-estimé le coût de la rendre *vraiment* utilisable.

## Décisions prises en cours de route

- **Guard SSRF à deux niveaux** (création `400 BLOCKED_HOST` + runtime), `allowPrivateHosts` off en prod / on en dev-test pour ne pas casser les mocks loopback.
- **DNS-rebinding laissé en dette explicite** (le pinning d'IP demande un dispatcher undici custom) — tracé, pas bâclé.
- **Header forwarding ajouté au runtime** mais **pas** au template du kit → divergence « même MCP des deux côtés » assumée et tracée.

## Findings EVALUATE et leur traitement

- SSRF (bloquant) → **corrigé** (`ssrf-guard.ts` + tests).
- Dédup re-parse/whitelist + client error handling → **corrigés** (refactor).
- Test demo écrivant dans `~/Desktop` → **supprimé**.
- Cache McpServer (perf), DNS-rebinding, parité runtime↔kit, body forwarding, `cookie`, `allowPrivateHosts`, persistance store, snippet Claude → **tracés en BACKLOG/RETRO** (non bloquants MVP).

## Pattern récurrent détecté (seuil 3) → promu en règle

**La couche de relai/proxy se comporte différemment contre un vrai upstream/client que ce que les tests unitaires suggèrent.** Occurrences :
1. Pivot-3 — mono-session (`Server already initialized` au 2ᵉ client), vu seulement en E2E.
2. Pivot-3 — token relayé : CRLF interne accepté par la regex, vu en security-review.
3. Pivot-4 — `Notion-Version` (param header) jeté, vu en UAT réel Claude/Notion.

→ Promu dans `.claude/rules/03-testing.md` : **toute couche qui relaie/proxifie vers un upstream externe exige un test E2E contre un vrai upstream (ou mock fidèle) ET un vrai client** avant de la déclarer fonctionnelle.

## Reference

Détail : `.workflow/RETRO.md` § « Après phase Pivot-4 ». Dette : `.workflow/BACKLOG.md` § « Runtime hébergé — suites Pivot-4 ».
