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
Fichier append-only. Les decisions obsoletes sont marquees "superseded", jamais supprimees.
Alimente par le workflow FORGE (phases ORIENT et LEARN).
