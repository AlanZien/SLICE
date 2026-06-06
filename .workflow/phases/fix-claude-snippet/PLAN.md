# PLAN — fix-claude-snippet : snippet Claude Desktop mcp-remote

## Objectif
Remplacer le snippet `url + headers` (ne fonctionne pas dans l'écran connecteur Claude Desktop)
par le format `mcp-remote` via npx, qui s'insère dans `claude_desktop_config.json`.

## Format cible
```json
{
  "mcpServers": {
    "mon-api": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://slice.dev/m/abc123",
               "--header", "Authorization:Bearer COLLE_TON_TOKEN_ICI"]
    }
  }
}
```

## Fichiers impactés
| Fichier | Changement |
|---|---|
| `src/client/lib/snippets.ts` | `buildHostedClaudeSnippet` → format mcp-remote |
| `src/client/components/connection-tabs.test.tsx` | Mettre à jour le snapshot/assertion |

## Tâches

- [ ] RED : test `buildHostedClaudeSnippet` → contient `mcp-remote` et `--header`
- [ ] GREEN : réécrire `buildHostedClaudeSnippet` avec le format npx mcp-remote
- [ ] Mettre à jour les tests existants qui assertent l'ancien format `url + headers`

## Definition of Done
- Tests verts
- Le snippet généré contient `"mcp-remote"`, `"--header"`, et `Authorization:Bearer COLLE_TON_TOKEN_ICI`
- Aucun autre snippet (n8n, Airia) n'est modifié
