# Spike Log

## Spike : Relai d'auth via AsyncLocalStorage (2026-05-31, Pivot-3 / OQ-3)

**Question :** Le contexte `AsyncLocalStorage` (token entrant attaché à la requête) survit-il à la traversée `StreamableHTTPServerTransport.handleRequest()` → handler du tool du MCP SDK ? C'est le prérequis du mode relai (relayer le header `Authorization` sans changer la signature des tools).

**Approche :** Montage minimal in-process — un `McpServer` avec un tool qui lit `als.getStore()`, un serveur HTTP qui wrap `handleRequest` dans `als.run({ auth }, …)`, piloté par un `Client` MCP (`StreamableHTTPClientTransport`) envoyant `Authorization: Bearer SPIKE-TOKEN`. SDK `@modelcontextprotocol/sdk@1.29.0`.

**Resultat :** ✅ Le handler du tool voit `'Bearer SPIKE-TOKEN'`. Le contexte ALS se propage correctement à travers le SDK. Test rapide (~1s), stable.

**Decision :** On retient l'architecture **ALS** (module `auth-context.ts` partagé + `als.run` autour de `handleRequest` côté serveur, lecture du token par requête côté `http-client`). **Plan B écarté** (serveur/transport par requête) — inutile, l'ALS suffit. Cf. SPEC-CLOUD RC2.

**Code :** Spike conservé et promu en **test de régression permanent** (`src/server/services/relay-threading.test.ts`) — garde le mécanisme sous surveillance aux montées de version du SDK. (Exception assumée à la règle « spike jetable » : le test est minimal, rapide et protège une hypothèse critique.)

---
Alimente par le workflow FORGE (phase ORIENT).
Les spikes sont des prototypes jetables — le code n'est jamais merge.
