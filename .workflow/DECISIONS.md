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
Fichier append-only. Les decisions obsoletes sont marquees "superseded", jamais supprimees.
Alimente par le workflow FORGE (phases ORIENT et LEARN).
