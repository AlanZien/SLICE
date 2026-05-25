# Plan : Phase 09 — Test E2E "le MCP généré fonctionne sans modification" (R1.4.8)

Date : 2026-05-25
SPEC : .workflow/SPEC.md (R1.4.8)
Statut : DRAFT

## Objectif

Garantir, par un test E2E intégral et reproductible, que le ZIP produit par `/api/generate` donne un serveur MCP fonctionnel **sans aucune modification manuelle** : décompression → install → build → démarrage → handshake MCP `initialize` en < 3s.

## Isolement intentionnel en phase dédiée

Ce test est lent (install npm, build TS) et flaky par nature en CI. Le placer dans une phase propre permet de :
- Le gater derrière un flag `RUN_E2E=1` ou exécution nightly only
- Avoir une PR dédiée avec un commit de référence où R1.4.8 est validée bout-en-bout
- Documenter précisément la procédure pour répliquer en local

## Fichiers impactes (≤ 5)

- [ ] `e2e/mcp-generated.e2e.test.ts` — test E2E principal
- [ ] `e2e/helpers/run-mcp.ts` — helper : spawn process, parle JSON-RPC stdio, gère timeouts/cleanup
- [ ] `e2e/fixtures/.npmrc` + cache local node_modules optionnel pour accélérer
- [ ] `.github/workflows/e2e.yml` — workflow CI gated `RUN_E2E=1` ou nightly
- [ ] `package.json` — scripts `test:e2e`, `test:e2e:local`

## Taches

- [ ] 1. Implémenter `helpers/run-mcp.ts` :
  - `runMcpInTempDir(zipBuffer, env)` :
    - Crée un dossier temp via `fs.mkdtemp`
    - Décompresse le ZIP (via `adm-zip` ou `unzipper`)
    - `pnpm install --prefer-offline` (avec cache local si dispo)
    - `pnpm run build`
    - Spawn `node dist/index.js` avec `env` injecté
    - Communique en JSON-RPC sur stdin/stdout
    - Retourne `{ send, close, output }`
  - Cleanup : kill process + rm dossier temp
  - Timeout global 60s sur l'ensemble du flow
- [ ] 2. Implémenter `mcp-generated.e2e.test.ts` :
  - Charger fixture `shopify-23.yaml`
  - POST `/api/generate` avec config `{ mode: 'stdio', auth: { type: 'apiKey', headerName: 'X-Shopify-Access-Token' } }` + 23 ids
  - Récupérer le ZIP (buffer)
  - `runMcpInTempDir(zip, { SHOPIFY_API_KEY: 'fake' })`
  - Envoyer `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}`
  - **Assertion 1** : réponse `initialize` reçue en < 3s
  - **Assertion 2** : réponse contient `serverInfo.name === 'shopify-admin-api'`
  - Envoyer `tools/list`
  - **Assertion 3** : exactement 23 tools listés
  - **Assertion 4** : chaque tool a un schema d'inputs Zod valide
- [ ] 3. Variante test HTTP : config `{ mode: 'http' }`, le MCP démarre sur un port libre, fetch `POST /` avec auth Bearer → mêmes assertions adaptées au transport HTTP
- [ ] 4. CI workflow `.github/workflows/e2e.yml` : déclenché manuellement (`workflow_dispatch`) + nightly cron (`schedule`). Cache pnpm + cache node_modules de la fixture.
- [ ] 5. Scripts `package.json` :
  - `test:e2e:local` — run avec cache local rapide
  - `test:e2e` — run propre (sans cache, comme en CI)
- [ ] 6. Documenter dans `docs/e2e.md` : comment lancer en local, temps attendu, pièges connus

## Tests TDD (méta-tests sur le helper)

- [ ] `runMcpInTempDir` cleanup le dossier temp même en cas d'échec — `run-mcp.test.ts`
- [ ] `runMcpInTempDir` kill le process child après cleanup — idem
- [ ] `runMcpInTempDir` propage l'output stderr en cas d'échec build — idem

## Tests E2E

- [ ] **R1.4.8 stdio** : ZIP shopify-23 mode stdio → handshake < 3s, 23 tools listés
- [ ] **R1.4.8 http** : ZIP shopify-23 mode http → handshake < 3s, 23 tools listés (via HTTP transport)
- [ ] Smoke E2E avec une 2e fixture (custom-10) pour valider robustesse

## UAT

- En local : `pnpm test:e2e:local` passe en < 60s.
- En CI nightly : workflow vert le matin suivant un merge.
- Manuel : un dev humain télécharge un ZIP via l'UI, suit le README, connecte à Claude Desktop, voit les tools dans une conversation. (UAT le plus important).

## Documentation

- [ ] `docs/e2e.md` créé : procédure, dépendances, timing attendu, troubleshoot
- [ ] README : section "Tests" avec mention du E2E nightly

## Definition of Done

- [ ] Test E2E stdio passe localement et en CI nightly
- [ ] Test E2E http passe
- [ ] Helper `run-mcp` ne laisse jamais de processus zombie
- [ ] UAT manuel : un MCP généré marche dans Claude Desktop
- [ ] Commit + PR
