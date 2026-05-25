# Plan : Phase 07 — Templates Handlebars + générateur de fichiers MCP

Date : 2026-05-25
SPEC : .workflow/SPEC.md (R1.4.7, R1.4.9)
Statut : DRAFT

## Objectif

Implémenter le moteur de templating qui produit les 8 fichiers d'un serveur MCP à partir d'une `ParsedSpec` + sélection + config. Aucun endpoint API exposé dans cette phase : pure fonction `generate(req): Map<filePath, content>`.

## Fichiers impactes (≤ 5 logiques + N templates)

- [ ] `src/server/services/mcp-generator.ts` — orchestrateur fonction pure
- [ ] `src/server/services/zod-schema-builder.ts` — params OpenAPI → string Zod
- [ ] `src/server/templates/*.hbs` — 8 templates Handlebars (`index.ts`, `tools.ts`, `http-client.ts`, `package.json`, `tsconfig.json`, `env.example`, `gitignore`, `readme.md`)
- [ ] `src/shared/types.ts` — type `GenerateRequest`, `GeneratedFile`
- [ ] `fixtures/shopify-23.yaml` — fixture pour tests downstream phases 08/09

## Taches

- [ ] 1. Installer dep : `handlebars`
- [ ] 2. Définir `GenerateRequest = { parsedSpec, selectedIds, config }` + schéma Zod partagé
- [ ] 3. Implémenter `zod-schema-builder.build(param)` :
  - `{type:'string'}` → `z.string()`
  - `{type:'integer'}` → `z.number().int()`
  - `{type:'boolean'}` → `z.boolean()`
  - `{type:'array', items}` → `z.array(buildItems)`
  - `{type:'object', properties}` → `z.object({...})`
  - Suffixe `.optional()` si non requis, `.describe()` si description (et `includeParamDescriptions` activé)
- [ ] 4. Écrire `tools.ts.hbs` : `import { z } from 'zod';` + itère sur endpoints sélectionnés, génère `server.tool(<safeName>, <description>, <zodInputs>, async (args) => httpClient.call(<method>, <pathWithParams>, args))`. Safe-name = camelCase du label.
- [ ] 5. Écrire `index.ts.hbs` : imports SDK, instancie `Server({name, version})`, charge transports selon `config.mode` :
  - `stdio` → `StdioServerTransport()`
  - `http` → `StreamableHTTPServerTransport()` avec auth Bearer via env
  - `both` → choix au runtime via env `MCP_TRANSPORT=stdio|http` (par défaut stdio si non set)
- [ ] 6. Écrire `http-client.ts.hbs` : wrapper `fetch` avec injection auth selon `config.upstreamAuth.type` (none / apiKey via header configurable / Bearer), propagation transparente des erreurs HTTP en réponse MCP
- [ ] 7. Écrire `package.json.hbs` : `{name: <config.mcpName>, version: "0.1.0", scripts: {build: "tsc", start: "node dist/index.js"}, dependencies: {"@modelcontextprotocol/sdk": "<version-figée>", "zod": "<v>", "dotenv": "<v>"}}`. Versions figées à valider en phase (recherche dernière stable du SDK MCP au moment du dev).
- [ ] 8. Écrire `tsconfig.json.hbs`, `env.example.hbs` (vars selon auth + mode), `gitignore.hbs`
- [ ] 9. Écrire `readme.md.hbs` : sections Installation, Démarrage (stdio / http), Connexion à Claude Desktop (snippet config), Connexion à n8n (URL + Bearer), Connexion à Airia. Sections conditionnelles selon `config.mode`.
- [ ] 10. Implémenter `mcp-generator.generate(req): Map<filePath, content>` :
  - Pour chaque template, charge, compile (cache), applique au contexte
  - Le contexte inclut : mcpName, baseUrl, mode, auth, endpoints filtrés (whitelist `selectedIds`), includeParamDescriptions
  - Retourne une Map dont les clés sont les chemins relatifs cibles du ZIP
- [ ] 11. Créer fixture `fixtures/shopify-23.yaml` (subset Shopify, 23 endpoints) pour les tests downstream

## Tests TDD

- [ ] `zod-schema-builder.build({type:'string', required:true})` → `'z.string()'` — `zod-schema-builder.test.ts`
- [ ] `zod-schema-builder.build({type:'integer', required:false})` → `'z.number().int().optional()'` — idem
- [ ] `zod-schema-builder.build({type:'object', properties:{a:{type:'string'}}})` → `'z.object({ a: z.string() })'` — idem
- [ ] `zod-schema-builder.build({type:'array', items:{type:'string'}})` → `'z.array(z.string())'` — idem
- [ ] `zod-schema-builder.build({description:"foo"}, true)` inclut `.describe("foo")` — idem
- [ ] `mcp-generator.generate(req)` produit exactement 8 fichiers attendus avec les bons chemins — `mcp-generator.test.ts`
- [ ] `mcp-generator.generate()` injecte le `mcpName` dans `package.json.name` — idem
- [ ] `mcp-generator.generate()` ne contient `StdioServerTransport` que si mode∈{stdio,both} — idem
- [ ] `mcp-generator.generate()` ne contient `StreamableHTTPServerTransport` que si mode∈{http,both} — idem
- [ ] `mcp-generator.generate()` injecte le header d'auth amont correct si type=apiKey — idem
- [ ] `mcp-generator.generate()` ne déclare que les endpoints whitelistés via `selectedIds` — idem
- [ ] `mcp-generator.generate()` README.md généré contient le bon snippet Claude Desktop selon mode — idem
- [ ] Snapshot test : pour une fixture shopify-23 + config "both"+apiKey, l'index.ts généré contient les 23 `server.tool(...)` attendus — `mcp-generator.snapshot.test.ts`

## UAT

- Pas d'UAT direct sur cette phase (pas d'UI ni d'API exposée).
- Vérifier visuellement le code généré dans un dossier temp : lisibilité, formatage, imports corrects, types stricts.

## Documentation

- [ ] `docs/mcp-template.md` : explique chaque template, son rôle, ses variables Handlebars

## Definition of Done

- [ ] Tests TDD passent
- [ ] Tests snapshot stables (commités)
- [ ] Code généré compile via `tsc --noEmit` dans un dossier temp (test ajouté)
- [ ] /review sans problème critique
- [ ] Commit + PR
