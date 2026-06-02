# Journal des decisions architecturales

## D001 : Templating du code MCP généré — Handlebars (2026-05-25)

**Statut :** accepted

**Contexte :** SLICE génère du code TypeScript (8 fichiers : `index.ts`, `tools.ts`, `http-client.ts`, `package.json`, etc.) à partir de la spec OpenAPI parsée. Il faut un moteur de templating textuel pour interpoler les variables (nom du tool, paramètres Zod, URL de base, etc.) dans des modèles de fichiers.

**Decision :** Utiliser **Handlebars** (`handlebars`) côté serveur Node pour tout le templating de la phase GENERATE.

**Alternatives envisagées :**
- **Handlebars** — syntaxe `{{variable}}`, écosystème massif, documentation et exemples très abondants. Performance moyenne mais non critique (génération de 8 petits fichiers, < 100 ms).
- **Eta** — syntaxe `<%= variable %>`, plus rapide, écrit en TypeScript natif, plus moderne. Communauté plus petite, moins d'exemples publics.

**Consequences :** On accepte la perf moyenne de Handlebars (non bloquante pour SLICE). On gagne en facilité de maintenance et de contribution (lib la plus connue du JS world). Dépendance ajoutée au backend : `handlebars` (peer-dep zéro, ~50 Ko gzip).

---

## D002 : Pivot livraison hébergée — SLICE Cloud (Coolify) + self-host (2026-05-31)

**Statut :** accepted

**Contexte :** Le modèle "ZIP source à télécharger" (SPEC.md) ne couvre pas le besoin d'un utilisateur non-tech qui veut un MCP utilisable sans rien installer. Le modèle "binaire double-clic" (exploré phases 11/12) a été abandonné (impossibilité Gatekeeper/notarisation Apple). Il faut un modèle de livraison qui produise directement une URL exploitable.

**Décision :** Livraison hébergée à deux tracks en MVP, un troisième en vision :
- **Track A — SLICE Cloud** : SLICE déploie le MCP via l'**API Coolify** sur le VPS OVH de l'opérateur (1 conteneur = 1 MCP), renvoie une **URL non-devinable** (≥128 bits). Déploiement asynchrone, suivi in-memory à TTL.
- **Track C — Sur mon serveur** : bundle Docker (Dockerfile + compose + doc) téléchargeable, self-host par l'utilisateur.
- **Track B — Railway one-click** : reporté post-MVP (Pivot-5).

**Mode de secrets :** **relai** du header `Authorization` entrant vers l'API cible. Aucun secret utilisateur stocké côté SLICE ni Coolify.

**Alternatives écartées :**
- **Vercel/serverless pour héberger les MCP** — incompatible avec un serveur MCP HTTP long-lived stateful (`StreamableHTTPServerTransport`, sessions), et le code généré utilise `node:http`. Réécriture lourde.
- **Runtime multi-tenant maison** — Coolify porte déjà l'orchestration (build/run/domaine), pas besoin de le recoder.
- **Stockage chiffré des secrets côté SLICE** — refusé : surface de responsabilité légale/sécurité majeure pour un MVP.
- **Binaire signé Apple (phases 11/12)** — abandonné, notarisation per-request inviable.

**Conséquences :**
- Le backend n'est plus "stateless 100%" : état de build éphémère in-memory, Track A single-instance en MVP (pas de DB pour autant).
- Nouvelle variante du template MCP : `MCP_AUTH_MODE=relay` (auth amont lue du header entrant).
- Nouveaux endpoints serveur : `POST /api/deploy`, `GET /api/deploy/:id/status`. `POST /api/generate` bascule en `delivery: docker` (ZIP source nu déprécié — cf. OQ-4).
- Secrets opérateur (`COOLIFY_API_TOKEN`) côté serveur uniquement.

---

## D003 : Hébergement = runtime MCP multi-tenant dans SLICE (pas de conteneur par MCP) (2026-05-31)

**Statut :** accepted. **Supersede** le mécanisme de déploiement de SPEC-CLOUD RC4 (création d'une app Coolify par MCP).

**Contexte :** L'approche initiale (RC4 + recherche Coolify) déployait **un conteneur par MCP** via l'API Coolify. Analyse + longue discussion produit : c'est **lourd et fragile** — build d'image ou dépôt Git **par MCP**, registry, limite ~3-5 MCP par VPS, prolifération de repos, coûts proportionnels au **nombre** de MCP même inactifs. Ne colle pas au modèle économique (démos gratuites doivent coûter ~0).

**Décision :** **SLICE est lui-même un serveur MCP multi-tenant.** Un seul moteur partagé sert tous les MCP hébergés :
- Route `/m/:id` (transport Streamable HTTP du SDK).
- Store `id → config` (la "fiche" = sous-ensemble OpenAPI distillé + baseURL + type d'auth). Persiste.
- À la requête : lookup config → `buildHostedMcpServer(config)` **instancie un `McpServer` en mémoire** (tools dérivés de la config, schémas Zod runtime) → sert. Cacheable par `id` (LRU). Pas de process par tenant.
- Chaque tool = `fetch(baseURL+path)` en **relayant le header `Authorization`** entrant (mécanisme Pivot-3, réécrit côté SLICE).
- **Coolify ne sert plus qu'à héberger SLICE** (une seule app), pas à orchestrer N conteneurs.

**Alternatives écartées :**
- **Conteneur/build par MCP via API Coolify** (RC4 initial) — lourd, cher, repo-par-MCP, limite VPS. Écarté.
- **Deploy one-click sur le VPS du client (SSH)** — tue-confiance (personne ne donne sa clé SSH à un outil tiers). Écarté.
- **Image générique + recette injectée** — revient au même qu'un moteur multi-tenant, en plus indirect.

**Conséquences :**
- Introduit un **store de configs** (KV/DB léger) → le backend n'est plus "stateless" (cohérent avec l'addendum PRD / D-PIVOT-7). Les **secrets ne sont toujours pas stockés** (relai).
- **Isolation par process partagé** (pas un conteneur par client). Acceptable car aucun secret stocké ; isolation forte = V1.5.
- Coût = **storage (fiches inactives ≈ 0) + trafic réel**, pas "par MCP". Débloque le freemium.
- Le track **self-host (kit Docker, Pivot-2)** reste inchangé — c'est l'autre voie, pour qui veut héberger lui-même.
- Cœur livré : `src/server/services/hosted-mcp-factory.ts` (`buildHostedMcpServer` + relai), prouvé par `hosted-mcp-factory.test.ts`.

## D004 : Isolation du parsing OpenAPI par child_process (anti-OOM) (2026-06-01)

**Statut :** accepted (issu du spike ORIENT, cf. SPIKE-LOG).

**Contexte :** Une spec valide mais pathologique (DocuSign, 3,13 MB < limite 10 MB) fait OOM (>2 GB) au déréférencement `$ref` de swagger-parser et **crashe tout le serveur** (DoS). Les gardes existantes (taille 10 MB, timeout 5s coopératif, profondeur de nœuds sur l'arbre brut) ne couvrent pas : l'explosion est *pendant* le deref, l'arbre brut est petit, et le timeout `Promise.race` ne peut pas interrompre du CPU-bound synchrone.

**Décision :** Isoler `parseSpec` dans un **child_process** jetable par parse, avec :
- **garde primaire = wall-clock timeout parent** qui `child.kill()` (~8 s) — le spike montre qu'à cap mémoire bas l'OOM met ~132 s (thrash GC), donc le timeout est la défense rapide ;
- **filet = `--max-old-space-size`** (cap heap, OOM → SIGABRT capté) ;
- **contrat d'erreur** : l'enfant écrit `{ ok, code, message }` JSON sur stdout, le parent re-`throw new ParseError(code, message)` ; pas de sortie / signal → `PARSE_TOO_COMPLEX` ;
- **cap de concurrence** (sémaphore, 2–4 parses simultanés) pour ne pas rouvrir le DoS multi-requête.

**Alternatives écartées :**
- **worker_threads + resourceLimits** — résolution de module cassée sous `tsx` (le loader ne se propage pas au worker), nesting worker-dans-worker fragile sous Vitest. Écarté malgré l'API mémoire native plus propre.
- **Heuristique d'estimation d'expansion `$ref`** — fragile, ne couvre pas l'inconnu ; l'isolation process est une barrière dure quel que soit le contenu.
- **Baisser la limite de taille** — faux fix : la mémoire n'est pas proportionnelle à la taille.

**Conséquences :**
- Parsing hors du process serveur principal → un parse pathologique ne tue plus le serveur (prouvé en spike : parent survit au SIGABRT enfant).
- Chemins concernés : `/api/upload`, `/api/generate`, `/api/host` (froids). `/m/:id` ne re-parse pas → aucune régression de latence agent.
- Coût : spawn par parse (~centaines de ms, cold-path) + résolution dev (`node --import tsx`) vs prod (`node` compilé) à câbler au build.
- À implémenter : branche `feature/parser-oom-isolation` (SPEC `.workflow/SPEC-PARSER-OOM.md`).

## D005 : Stratégie de test du flow OAuth client_credentials généré (OAuth-1b) — pas de spike (2026-06-02)

**Statut :** accepted

**Contexte (ORIENT) :** la SPEC OAuth recommandait un spike pour valider le banc de test de 1b (deux serveurs mockés — token + upstream — et mesure du nombre de POST tokenUrl à travers un client MCP). En lisant `mcp-generator.relay.test.ts`, deux choses deviennent claires sans prototypage :
1. Ajouter un 2ᵉ serveur HTTP mocké (le token endpoint) est trivial — c'est le pattern exact du serveur `upstream` déjà présent (`createServer` + `freePort` + tableau-compteur).
2. **Le kit généré est mono-session** (un client à la fois par process, cf. commentaire L109-110 du test relai). Donc tester la **dédup de concurrence in-flight (R14)** « 3 appels parallèles → 1 POST » via le client MCP est **impossible** (le 2ᵉ client parallèle déclenche `Server already initialized`).

**Décision :** trancher la stratégie de test **par analyse, sans spike** (ORIENT étape 1 : réponse claire et fondée) :
- **Banc runtime du kit** (process unique, appels **séquentiels**) + 2 serveurs mockés (token + upstream), dérivé de `mcp-generator.relay.test.ts` → couvre R11 (forme du POST token), R12 (bearer attaché à l'upstream), R13 (cache : 2ᵉ appel → 0 nouveau POST), R15 (retry 401), R16/R16bis (échec token, token_type).
- **R14 (dédup concurrence in-flight)** : testé sur le **module `oauth-token` isolé** (importé en runtime via `tsx`, `getToken()` × 3 en parallèle → 1 seul fetch), **pas** via le transport MCP.
- **tokenUrl http en test** : via l'échappatoire R19bis (validation https assouplie pour hôtes locaux, façon `allowPrivateHosts`).

**Alternatives écartées :**
- **Spike worktree (½ j)** : inutile — le pattern est entièrement dérivable du harness relai existant ; aucune inconnue persistante.
- **Tester R14 via le transport MCP** : impossible (kit mono-session → `Server already initialized`).

**Conséquences :** REFINE de 1b structure les tests sur ces deux bancs (kit séquentiel + module isolé). Gain : la demi-journée de spike est économisée. À implémenter : branche `feature/oauth-1b` (SPEC `.workflow/SPEC-OAUTH-UPSTREAM.md`, règles R10-R19bis).

---
Fichier append-only. Les decisions obsoletes sont marquees "superseded", jamais supprimees.
Alimente par le workflow FORGE (phases ORIENT et LEARN).
