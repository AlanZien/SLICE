# REVIEW — CI pré-release + pnpm figé (PR #28, mergée 2026-06-02)

## Objectif

Transformer les deux garde-fous existants mais **manuels** (`prod:smoke`, `corpus-check`) en filets automatiques, et rendre les builds reproductibles (pnpm figé). Pré-requis posé avant le gros chantier OAuth amont.

## Ce qui a bien fonctionné

- **Cadrage produit avant tech** : l'utilisateur ne comprenait pas les options techniques au départ. Reformuler en langage humain (« filet de sécurité automatique » vs « le gros morceau OAuth ») a permis une décision nette, puis un second arbitrage utile (« ce test corpus est-il vraiment essentiel ? ») qui a **allégé le scope** : corpus en `workflow_dispatch` seul, pas de nightly/notifications. Moins de mécanique pour le même bénéfice à ce stade.
- **Le gate a prouvé sa valeur dès le premier run** : il a fait échouer `mcp-generator.snapshot.test.ts`, un test qui **n'avait jamais tourné en CI** (il n'y avait pas de CI) et qui passait en local mais cassait en environnement propre. Exactement la classe de bug que le filet doit attraper.
- **Découpage testable** : le seul morceau réellement TDD-able (`hasRealBugs`) a été isolé en fonction pure exportée + 4 tests. Le reste (YAML CI) validé par l'UAT réel = le run vert sur la PR.

## Ce qui a été difficile / appris en cours de route

- **`pnpm exec` n'est pas hermétique en CI.** Le snapshot test compilait le bundle généré via `pnpm exec tsc` dans un tmp dir où il symlinkait les deps du workspace. En CI, corepack récupère une **pnpm plus récente (11.5.0)** dont `verify-deps-before-run` déclenche un **`pnpm install` implicite** dans le tmp dir → écrase les symlinks → `Cannot find module '@modelcontextprotocol/sdk/server/mcp.js'`. Fix : invoquer le **binaire `tsc` du workspace directement** (`node_modules/.bin/tsc`), sans passer par le package manager. Hermétique, déterministe.
- **`workflow_dispatch` n'apparaît qu'une fois le fichier sur la branche par défaut.** `corpus.yml` n'est déclenchable (`gh workflow run` / bouton UI) qu'**après merge** sur main — limitation GitHub, pas un défaut. UAT #2 validable seulement post-merge.
- **Choix pnpm@9.13.2** (et non `@10.x` comme suggéré au BACKLOG) : l'environnement local et le lockfile sont sur 9.13.2 ; figer sur la version réellement active évite tout désalignement store. Le note BACKLOG datait d'un état machine transitoire (node_modules installé en pnpm 10 pendant fix-prod-build).

## Décisions prises

- **Deux workflows séparés** : `ci.yml` (gate déterministe sur chaque PR/push main : typecheck + test + prod:smoke, zéro réseau) ; `corpus.yml` (réseau/lent, `workflow_dispatch` à la demande, hors flux PR pour ne pas rendre une PR rouge à cause d'APIs.guru injoignable).
- **`corpus-check` rendu CI-utilisable** : `exit(1)` sur vrai bug (CRASH/zodfail) via `hasRealBugs` ; les rejets gracieux / hoquets réseau ne rougissent pas le run. Guard `import.meta.url` pour ne pas exécuter `main()` à l'import (sinon le test déclencherait un fetch réseau).
- **`corepack enable` avant `setup-node` avec `cache: pnpm`** (ordre correct, piège classique évité).

## Findings EVALUATE (/simplify)

Diff dominé par la config. Aucune correction appliquée : duplication mineure `bugs`/`hasRealBugs` gardée volontairement (le prédicat nommé et testé au point de sortie lit comme une intention ; tableau ≤120 éléments). Bloc setup répété entre les 2 workflows : composite action = sur-ingénierie pour 2 workflows, skippé.

## Pattern récurrent (déjà en règle)

« **Valider contre la réalité avant tout claim prod** » (déjà promu dans `03-testing.md`) — **nouvelle confirmation** : la CME (première exécution en environnement propre) a révélé un test dépendant de l'état machine local. **Sous-pattern affiné** : un test qui shell-out vers un package manager (`pnpm exec`, `npm exec`) n'est pas hermétique — la version du PM résolue par corepack varie selon l'environnement et peut injecter un install. Invoquer le binaire directement. Promu dans `03-testing.md`.

## Dette / suite

- **OAuth amont** = prochain chantier (plus gros levier de couverture, ~1/5 des APIs réelles). Le filet CI est maintenant en place pour détecter toute régression de build/parsing pendant ce travail.
- Reste ouvert : unification contrat d'erreur code→HTTP, cache McpServer (perf `/m/:id`), DNS-rebinding, persistance store, divergence runtime↔kit, snippet Claude Desktop.
