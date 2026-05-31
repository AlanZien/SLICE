# Plan : Phase Pivot-2 — Kit Docker self-host

Date : 2026-05-31
SPEC : .workflow/SPEC-CLOUD.md (RC3, RC5.5/5.6)
Statut : DRAFT

## Objectif

Le bouton « Download the kit » produit un bundle qui démarre en une commande Docker (`docker compose up`) et se déploie sur n'importe quel PaaS/VPS, avec une doc claire — sans toucher au moteur de génération du code MCP.

## Cadrage (décisions de cette phase)

- **L'écran de succès existant est réutilisé tel quel** : il télécharge déjà le bundle (`useDownload`) et affiche des snippets URL (n8n/Airia avec `Authorization: Bearer <MCP_SERVER_TOKEN>`), ce qui correspond exactement au modèle **env-var** du self-host (RC3.4). La refonte profonde de l'écran résultat (mode relai, état déploiement) est **différée et unifiée avec le track cloud (P5)**.
- **Les fichiers Docker sont toujours inclus dans le bundle** (pas de branche `delivery`) : c'est le livrable du self-host, et le track cloud (P4) n'utilise pas ce ZIP. Plus simple, zéro condition.
- **Port** : le kit écoute sur `MCP_HTTP_PORT` (défaut 8787), piloté via le `docker-compose.yml`. Le fallback `PORT` (PaaS one-click) est **différé à Track B**.

## Fichiers impactés

- [ ] `src/server/templates/Dockerfile.hbs` (nouveau) — image Node 20 multi-stage : stage build (`npm install` + `tsc`) → stage runtime (deps prod + `dist/`), `EXPOSE 8787`, `CMD ["node", "dist/index.js"]`.
- [ ] `src/server/templates/docker-compose.yml.hbs` (nouveau) — service unique `{{mcpName}}`, `build: .`, mapping `8787:8787` (paramétrable), `env_file: .env`, `restart: unless-stopped`.
- [ ] `src/server/templates/dockerignore.hbs` (nouveau) — `node_modules`, `dist`, `.env`, `.git`.
- [ ] `src/server/services/mcp-generator.ts` — enregistrer les 3 templates dans `STATIC_TEMPLATES`.
- [ ] `src/server/templates/readme.md.hbs` — ajouter sections « Run with Docker » (`docker compose up -d`) et « Deploy to a PaaS (Coolify / Railway / Render) » (pointer le service vers le Dockerfile + variables d'env à renseigner). Mentionner l'activation de `MCP_SERVER_TOKEN`.

## Tâches

- [ ] 1. Template `Dockerfile.hbs` (multi-stage).
- [ ] 2. Template `docker-compose.yml.hbs`.
- [ ] 3. Template `dockerignore.hbs`.
- [ ] 4. Enregistrer les 3 bindings dans `STATIC_TEMPLATES` (`mcp-generator.ts`).
- [ ] 5. Enrichir `readme.md.hbs` (Docker + PaaS).
- [ ] 6. Régénérer le snapshot du générateur (`mcp-generator.snapshot.test.ts`).

## Tests TDD (écrits EN PREMIER, RED → GREEN → REFACTOR)

- [ ] RC3.2 — `generateMcp(...)` émet un fichier `Dockerfile` à la racine du bundle — `src/server/services/mcp-generator.test.ts`
- [ ] RC3.2 — le `Dockerfile` est multi-stage Node, `EXPOSE 8787`, lance `node dist/index.js` — `mcp-generator.test.ts`
- [ ] RC3.2 — `generateMcp(...)` émet `docker-compose.yml` avec le service nommé d'après `mcpName`, un mapping de port et `env_file: .env` — `mcp-generator.test.ts`
- [ ] RC3.2 — `generateMcp(...)` émet `.dockerignore` excluant `.env` et `node_modules` — `mcp-generator.test.ts`
- [ ] RC3.2 — le `README.md` généré contient une section « Run with Docker » et une section « Deploy to … (Coolify/Railway/Render) » — `mcp-generator.test.ts`
- [ ] RC1.4 (rappel) — le `.env.example` du bundle contient `MCP_SERVER_TOKEN` (déjà couvert par le template `env.example.hbs`, à vérifier non régressé) — `mcp-generator.test.ts`

## Tests E2E

> RC3.6 (E2E `docker build` + run + handshake < 3s) **différé** : il exige Docker dans l'environnement de test, non garanti en CI unitaire. À cadrer comme test d'intégration manuel dans l'UAT (build local du bundle) plutôt qu'en Vitest. Noté comme finding RETRO si on veut l'automatiser plus tard.

## UAT (à remplir dans .workflow/UAT.md pendant DELIVER)

- Télécharger le kit (bouton « Download the kit »), décompresser.
- `docker compose up -d` → le conteneur démarre, le MCP répond sur `:8787`.
- Lire le README : instructions Docker + PaaS présentes et exactes.
- Vérifier que `.env.example` liste bien `UPSTREAM_*`, `MCP_SERVER_TOKEN`, `MCP_HTTP_PORT`.

## Documentation

- [ ] Le README **généré** (template) est la doc utilisateur ; pas de doc repo SLICE à mettre à jour à ce stade.

## Definition of Done

- [ ] Tous les tests TDD passent (GREEN)
- [ ] `pnpm typecheck` strict clean
- [ ] Suite complète verte (snapshot régénéré et revu)
- [ ] /simplify sans finding bloquant
- [ ] Code commité et PR créée sur `feature/pivot-2-docker-kit`
- [ ] UAT.md mis à jour

---
Généré par le workflow FORGE (phase REFINE — pivot SLICE Cloud). Validé par l'utilisateur avant GENERATE.
