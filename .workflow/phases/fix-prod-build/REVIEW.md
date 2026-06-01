# REVIEW — fix: réparation du build prod (PR #26, mergé 2026-06-01)

## Contexte
Le build prod compilé (`pnpm build` + `pnpm start`) ne démarrait **jamais**. Finding PROD-CRITIQUE tracé au smoke T6 de la phase parser-oom. Bloquant absolu avant tout déploiement. Branche `fix/prod-build`, 4 commits, 459 tests verts.

## Ce qui a bien fonctionné
- **Diagnostic incrémental « lance-le et regarde »** : chaque correction a révélé le bug suivant, masqué derrière. Lancer le binaire compilé (pas les units) a déroulé les 3 bugs un par un.
- **`tsc` + `tsc-alias` plutôt qu'un bundler** : choisi parce que le runtime fait des hypothèses fichier-par-fichier (`parse-child.js` sibling de `parse-isolated.js` ; `templates/` à `../templates` ; résolution `import.meta.url`). Un bundle aurait cassé ces résolutions. `resolveFullPaths` ajoute les `.js`, l'alias `@shared` est réécrit. Structure préservée = zéro régression runtime.
- **Le smoke a immédiatement attrapé une régression** : `SKIP_BUILD=1 pnpm prod:smoke` a échoué sur un `dist` clobbé par `typecheck`, exposant un 4ᵉ bug invisible autrement. Le garde-fou a prouvé sa valeur dans l'heure de sa création.

## Ce qui a été difficile / révélé
- **3 bugs prod distincts dans un seul démarrage**, tous invisibles en dev et aux 459 units :
  1. imports ESM sans extension + alias `@shared` non réécrit → `ERR_MODULE_NOT_FOUND` ;
  2. route catch-all `'*'` rejetée par Express 5 / path-to-regexp 8 au boot ;
  3. `clientDist` faux (`../client` au lieu de `../../client`) → front introuvable.
  Les bugs 2 et 3 vivent dans une branche `if (nodeEnv === 'production')` — **jamais exécutée** en dev (Vite sert le front) ni en test unitaire.
- **4ᵉ bug en cascade** : `tsc -b` (`pnpm typecheck`) émettait du JS dans `dist/server` via `tsconfig.server.json` **sans** passe `tsc-alias`, écrasant silencieusement le bon artefact. Un CI qui typecheck après build aurait livré du cassé. Corrigé en alignant le serveur sur le client (`noEmit` au typecheck, émission réactivée seulement dans `tsconfig.server.build.json`).

## Décisions prises en cours de route
- **D : `tsc` + `tsc-alias`** (pas esbuild/tsup) — préserve les hypothèses filesystem du runtime isolé. Alternative bundler écartée (casserait le spawn de `parse-child.js` + résolution des templates).
- **D : config de build dédié** `tsconfig.server.build.json` (exclut les tests → 38 `*.test.js` parasites retirés de `dist`), distinct du config de typecheck.
- **D : `noEmit` sur le config serveur de typecheck** — un seul propriétaire de l'émission vers `dist/server`.

## Patterns récurrents détectés
- **« Valider contre la réalité, pas contre des tests verts »** — déjà promu en règle (`03-testing.md`) à la session précédente avec le build prod cassé listé comme occurrence. Ce fix est la **5ᵉ confirmation** : aucun des 4 bugs n'était visible aux units, tous l'étaient en lançant le binaire compilé. Pas de nouvelle promotion ; le smoke `pnpm prod:smoke` matérialise le levier « vrai chemin de build » de la règle.
- **Sous-pattern net : les branches `NODE_ENV === 'production'` et les hypothèses sur la sortie compilée sont systématiquement non testées.** 3 des 4 bugs y vivaient. Désormais gardé par le smoke. À surveiller : si un 3ᵉ incident « prod-only path » survient hors couverture du smoke, créer une règle dédiée.

## Dette ouverte (→ BACKLOG)
- **Câbler `pnpm prod:smoke` en CI pré-release** (avec le corpus check) — sans ça le garde-fou ne tourne pas automatiquement.
- **Alignement pnpm** : `node_modules` installé en pnpm 10 (store v10), `pnpm` du PATH en 9.13.2 (store incompatible) → ajouter `packageManager` dans `package.json` + activer corepack pour figer la version.
