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

---
Fichier append-only. Les decisions obsoletes sont marquees "superseded", jamais supprimees.
Alimente par le workflow FORGE (phases ORIENT et LEARN).
