# PLAN — fix-store : persistance du hosted-store

## Objectif
Remplacer le Map in-memory par un store JSON sur disque. Survit aux redémarrages. Zéro nouvelle dépendance.

## Fichiers impactés
| Fichier | Changement |
|---|---|
| `src/server/services/hosted-store.ts` | Nouvelle impl `createFileHostedStore`, remplace le singleton |
| `.gitignore` | Ajouter `data/` |

## Tâches

- [ ] RED : test `createFileHostedStore` — put/get → persiste sur disque + lecture au redémarrage (instance fraîche sur même fichier)
- [ ] GREEN : implémenter `createFileHostedStore(filePath: string)`
  - `mkdirSync` du dossier parent au init
  - Lecture JSON au démarrage (si fichier absent → Map vide)
  - `put` : génère id, écrit JSON synchrone (`writeFileSync`)
  - `get` : lit depuis le Map en mémoire (chargé au démarrage)
  - Fichier corrompu → log + Map vide (pas de crash)
- [ ] REFACTOR : remplacer `hostedStore` singleton par `createFileHostedStore(path)` avec `path = process.env.SLICE_STORE_PATH ?? './data/hosted.json'`

## Definition of Done
- Tests verts
- `hostedStore.put(config)` survit à un `createFileHostedStore` sur le même fichier (simule redémarrage)
- Aucun changement dans `host.ts` ni `hosted-mcp.ts` (interface inchangée)
