# Plan : Phase 12 — Connecteur Claude Desktop intégré au binaire

Date : 2026-05-29
Statut : DRAFT — en attente validation utilisateur
Dépendances : Phase 11 (binaire standalone) doit être mergée

## Pourquoi cette phase

Après phase 14, l'utilisateur a un fichier exécutable sur son ordi mais doit toujours :
- Éditer manuellement `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- Y coller un bloc JSON avec le chemin absolu de son binaire et son token Notion
- Redémarrer Claude Desktop

Trois opérations système qui sortent du périmètre "un peu tech".

Objectif : quand l'utilisateur double-clique le binaire, **une mini-interface s'ouvre** qui automatise l'écriture de la config Claude Desktop. Plus aucune édition manuelle de fichier système.

## Cible utilisateur après cette phase

1. Télécharge le binaire (phase 14)
2. Double-clique
3. Choisit "Connecter à Claude Desktop"
4. Saisit son token Notion une fois
5. Reçoit "C'est connecté, redémarre Claude Desktop"
6. Redémarre Claude Desktop
7. Les tools apparaissent dans Claude

**Zéro édition de fichier système. Zéro JSON à coller.**

## Pattern technique

Le binaire fonctionne en **deux modes** détectés au démarrage :

- **Mode interactif** : lancé par double-clic (stdin est un TTY) → ouvre une UI console
- **Mode MCP** : lancé par Claude Desktop (stdin/stdout sont pipés) → comportement normal MCP

La détection se fait via `process.stdin.isTTY`. Si oui = TTY = humain qui lance, sinon = pipe = agent.

## Fichiers impactés

### Nouveaux dans le template MCP
- [ ] `src/server/templates/connector.ts.hbs` — module connecteur Claude Desktop
- [ ] `src/server/templates/cli-menu.ts.hbs` — boucle UI console
- [ ] Le `src/server/templates/index.ts.hbs` est modifié pour brancher la détection TTY

### Nouveaux côté SLICE (tests)
- [ ] `src/server/services/connector-template.test.ts` — vérifie que les templates générés sont valides
- [ ] Tests d'intégration : lancer le binaire en mode interactif, simuler input, vérifier l'écriture de config

## Tâches détaillées

### Étape A — Détection du mode au démarrage

- [ ] 1. Modifier `index.ts.hbs` pour détecter le mode au lancement :
  - Si `process.stdin.isTTY === true` → branche `runInteractive()`
  - Si pipe → branche normale MCP (comportement actuel)
- [ ] 2. La branche interactive doit imprimer une bannière claire :
  ```
  ┌────────────────────────────────────────┐
  │  Notion MCP — généré par SLICE         │
  │                                        │
  │  Que veux-tu faire ?                   │
  │  1) Connecter à Claude Desktop         │
  │  2) Quitter                            │
  └────────────────────────────────────────┘
  >
  ```

### Étape B — Connecteur Claude Desktop

- [ ] 3. Implémenter `connector.ts.hbs` avec une fonction `connectToClaudeDesktop()` :
  - Détecte la plateforme (`process.platform === 'darwin'` ou `'win32'`)
  - Calcule le chemin du fichier de config :
    - Mac : `~/Library/Application Support/Claude/claude_desktop_config.json`
    - Windows : `%APPDATA%\Claude\claude_desktop_config.json`
  - Si le dossier parent n'existe pas → propose de le créer
  - Si le fichier n'existe pas → crée un fichier minimal `{ "mcpServers": {} }`
  - Si le fichier existe → fait une sauvegarde `.bak` à côté
- [ ] 4. Demander les variables d'environnement requises à l'utilisateur via prompts console :
  - `UPSTREAM_BEARER_TOKEN` (ou `UPSTREAM_API_KEY` selon le type d'auth choisi à la génération)
  - Le chemin du binaire lui-même est récupéré via `process.argv[0]` (auto-référence)
  - `UPSTREAM_BASE_URL` est inscrit en dur dans le binaire au moment de la génération (pas demandé à l'utilisateur)
- [ ] 5. Construire le bloc JSON correspondant et le merger avec la config existante (ajout / overwrite de l'entrée `mcpServers[<mcpName>]`)
- [ ] 6. Écrire la nouvelle config en JSON formaté (préserver les autres entrées MCP de l'utilisateur)
- [ ] 7. Afficher un message clair :
  ```
  ✓ Configuration mise à jour.
  ✓ Sauvegarde créée : <path>.bak
  
  Redémarre Claude Desktop pour activer le MCP.
  Tape Entrée pour quitter.
  ```

### Étape C — Robustesse

- [ ] 8. Si l'écriture échoue (permissions, disque plein), capturer l'erreur, l'afficher en clair, et offrir de restaurer le `.bak`
- [ ] 9. Détection si Claude Desktop est en cours d'exécution → proposer un message "Claude Desktop est ouvert, ferme-le et relance-le pour activer le MCP" (sans tenter de tuer le process — trop intrusif)
- [ ] 10. Mode dry-run via flag `--dry-run` : affiche ce qui serait écrit sans toucher au fichier (utile pour tests)
- [ ] 11. Le mode interactif gère Ctrl+C proprement (pas de fichier laissé en état corrompu)

### Étape D — Mise à jour de l'écran de succès SLICE

- [ ] 12. Sur l'écran 4, l'onglet "Claude Desktop" affiche désormais **un seul bouton** "Connecter automatiquement" + une note "Lance le binaire et clique sur 1"
- [ ] 13. Le snippet JSON manuel reste accessible via un lien "Mode avancé" (pour ceux qui veulent éditer à la main)
- [ ] 14. Mise à jour de la barre des 3 étapes : passer de "Décompresse / Installe / Build" à "Télécharge / Lance / Connecte"

## Tests TDD

- [ ] `connectToClaudeDesktop` produit le bon chemin de config selon `process.platform` — `connector.test.ts`
- [ ] Crée le fichier de config si absent — idem
- [ ] Crée un `.bak` si le fichier existe avant écriture — idem
- [ ] Préserve les autres entrées MCP de l'utilisateur (test : config pré-remplie avec une autre entrée, doit être conservée) — idem
- [ ] Écrit un JSON valide (vérifié par re-parse après écriture) — idem
- [ ] Mode dry-run n'écrit rien — vérification fs avant/après
- [ ] Gère erreur d'écriture proprement (mock fs.writeFile rejette → message clair, pas de crash)
- [ ] Détection TTY : binaire en mode interactif si stdin TTY, sinon mode MCP — test d'intégration

## UAT critique

- Sur Mac : double-clic du binaire → Terminal s'ouvre → menu visible → choix 1 → demande de token → confirmation → fichier `claude_desktop_config.json` modifié sans rien casser des autres MCP existants → Claude Desktop redémarré → outils visibles
- Sur Windows : même flow, depuis cmd.exe → fichier `%APPDATA%\Claude\claude_desktop_config.json` modifié
- Test de régression : un utilisateur avec déjà 3 MCP configurés ajoute le nôtre → les 3 existants sont préservés

## Documentation

- [ ] `docs/connector-design.md` — explique le pattern TTY-vs-pipe, le format de config Claude Desktop, les gotchas par plateforme
- [ ] README dans le bundle généré : 3 lignes max ("double-clique le fichier, choisis 'Connecter à Claude Desktop'")

## Definition of Done

- [ ] Tests TDD passent
- [ ] UAT manuel : connexion réussie d'un MCP généré à Claude Desktop sur Mac via le mode interactif
- [ ] UAT manuel : idem sur Windows (peut être reporté à un test utilisateur si pas de machine Windows dispo)
- [ ] Aucun fichier `claude_desktop_config.json` corrompu lors des tests
- [ ] Backup `.bak` toujours créé avant modification
- [ ] /review sans problème bloquant
- [ ] Commit + PR

## Hors scope (à traiter ailleurs)

- Connecteurs pour Cursor / Windsurf / Claude Code / ChatGPT Desktop → phases futures séparées (même pattern, autre chemin de config)
- Mise à jour du binaire (si SLICE corrige un bug, l'utilisateur doit re-télécharger un nouveau binaire) → V2
- Mode désinstallation (retirer une entrée MCP via le menu interactif) → V2
- Code-signing macOS pour passer Gatekeeper sans clic-droit → V2 (nécessite Apple Developer account)
