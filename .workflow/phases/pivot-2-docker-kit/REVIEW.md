# Review — Phase Pivot-2 : Kit Docker self-host (mergée PR #17)

## Ce qui a bien fonctionné
- Phase courte et nette : 3 templates + enregistrement + README enrichi. Le pattern `STATIC_TEMPLATES` rend l'ajout de fichiers au bundle trivial.
- Réutilisation maximale : l'écran de succès existant gérait déjà download + snippets URL → le périmètre s'est resserré à « rendre le kit déployable », ~1 jour.
- 376 tests verts.

## Ce qui a été difficile
- Rien de bloquant. Petit ajustement : le `CMD` exec-form du Dockerfile ne matchait pas l'assertion RED (`node dist/index.js` vs `["node","dist/index.js"]`) → assertion corrigée vers `dist/index.js`, exec-form conservé (best practice signaux).

## Décisions prises en cours de route
- Fichiers Docker **toujours inclus** (pas de branche `delivery`) : le track cloud n'utilise pas ce ZIP, donc zéro condition.
- Dockerfile en **`npm`** (pas pnpm) pour ne pas installer pnpm dans l'image alpine ; scripts runner-agnostiques.
- E2E `docker build` réel **non automatisé** (dépendance Docker en CI) → UAT manuel.

## Findings EVALUATE et traitement
- STANDARD. Revue **/simplify faite inline** (proportionnalité : diff de templates sans logique). 0 finding. Reporté en RETRO : Docker docs inconditionnelles (OK car `mode` figé remote).

## Commentaires reviewers
- Aucun (PR auto-mergée, projet solo).
