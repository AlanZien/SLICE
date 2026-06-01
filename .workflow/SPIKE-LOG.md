# Spike Log

## Spike : Relai d'auth via AsyncLocalStorage (2026-05-31, Pivot-3 / OQ-3)

**Question :** Le contexte `AsyncLocalStorage` (token entrant attaché à la requête) survit-il à la traversée `StreamableHTTPServerTransport.handleRequest()` → handler du tool du MCP SDK ? C'est le prérequis du mode relai (relayer le header `Authorization` sans changer la signature des tools).

**Approche :** Montage minimal in-process — un `McpServer` avec un tool qui lit `als.getStore()`, un serveur HTTP qui wrap `handleRequest` dans `als.run({ auth }, …)`, piloté par un `Client` MCP (`StreamableHTTPClientTransport`) envoyant `Authorization: Bearer SPIKE-TOKEN`. SDK `@modelcontextprotocol/sdk@1.29.0`.

**Resultat :** ✅ Le handler du tool voit `'Bearer SPIKE-TOKEN'`. Le contexte ALS se propage correctement à travers le SDK. Test rapide (~1s), stable.

**Decision :** On retient l'architecture **ALS** (module `auth-context.ts` partagé + `als.run` autour de `handleRequest` côté serveur, lecture du token par requête côté `http-client`). **Plan B écarté** (serveur/transport par requête) — inutile, l'ALS suffit. Cf. SPEC-CLOUD RC2.

**Code :** Spike conservé et promu en **test de régression permanent** (`src/server/services/relay-threading.test.ts`) — garde le mécanisme sous surveillance aux montées de version du SDK. (Exception assumée à la règle « spike jetable » : le test est minimal, rapide et protège une hypothèse critique.)

---

## Spike : isolation mémoire du parsing OpenAPI (anti-OOM) — 2026-06-01

**Question :** Empêcher qu'une spec valide mais pathologique (DocuSign, 3 MB, OOM >2 GB au déref `$ref`) crashe le serveur. 4 inconnues : (1) fabriquer une `$ref` bomb déterministe qui OOM in-process ; (2) worker_threads + cap mémoire sous `tsx` ; (3) survie du parent à l'OOM de l'isolat ; (4) traversée du `ParseError.code`.

**Approche :** prototypes jetables (`.spike/`, détruits). Générateur de bomb = fan-out **non-cyclique** `L0`→K refs `L1`→…→`Ld` (dérefé `O(K^d)`). Testé : in-process à heap capé, worker_threads `resourceLimits`, child_process `--max-old-space-size`.

**Résultat :**
- **Bomb K=12,d=7** (<50 KB) → OOM garanti de `parseSpec` in-process. Fixture déterministe, sans réseau. ✅
- **worker_threads** : ❌ résolution de module cassée sous tsx (`Cannot find module …/parser`, même avec `--import tsx`) ; le loader ne se propage pas au graphe du worker.
- **child_process** : ✅ bout en bout — module résolu, bomb → enfant **OOM (SIGABRT)** capté par `close(code, signal)`, **parent survit** (parse normal juste après OK ~750 ms), code typé préservé via JSON stdout (`UNSUPPORTED_FORMAT`).
- **Finding timing** : à 128 MB la bomb met **~132 s** à OOM (thrash GC) → **le wall-clock timeout (kill enfant) est la garde PRINCIPALE**, le cap mémoire est le filet.

**Décision retenue :** **child_process** (spawn `node [--max-old-space-size] [--import tsx en dev] parse-child` + I/O JSON stdin/stdout), **pas worker_threads**. Garde primaire = **timeout parent qui `child.kill()`** (~8 s) ; cap mémoire = backstop. Contrat d'erreur : enfant écrit `{ ok, code, message }`, parent re-`throw new ParseError`.

**Raison :** child_process résout les modules dev (tsx) — worker_threads non ; isolation OS totale (parent survit au SIGABRT, prouvé) ; **sidestep le worker-in-worker de Vitest** (un test spawne un process, pas un worker imbriqué) ; cap `--max-old-space-size` éprouvé.

**Alternatives écartées :** worker_threads + resourceLimits (résolution module cassée + nesting Vitest fragile) ; heuristique d'expansion `$ref` (fragile, ne couvre pas l'inconnu) ; baisser la limite de taille (faux fix : mémoire ≠ taille).

**Impacts SPEC (à patcher avant REFINE) :** worker_threads → child_process partout ; R-O4 (timeout) = garde primaire ; I1 (Vitest) résolu nativement ; R-O7 (cap concurrence) inchangé.

---
Alimente par le workflow FORGE (phase ORIENT).
Les spikes sont des prototypes jetables — le code n'est jamais merge.
