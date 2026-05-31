# Review — Phase Pivot-1 : Écran « Où héberger ? » (mergée PR #16)

## Ce qui a bien fonctionné
- Découpage net : un cycle « contrat » (type + schéma + hook + fixtures) puis un cycle « écran » (cards + bouton). TDD respecté, commits RED/GREEN séparés.
- Choix d'altitude payant : garder `mode` figé à `'remote'` plutôt que de toucher au générateur → l'UX a changé sans aucun risque sur le code généré.
- 372 tests verts, typecheck strict clean au DELIVER.

## Ce qui a été difficile
- Un changement de **contrat partagé** (champ requis `hosting`) ripple sur ~9 fixtures dans 4 fichiers. La séparation stricte « 1 critère = 1 cycle » du workflow tient mal pour une modif de schéma transverse : traité comme un cycle de propagation atomique.
- L'utilisateur a eu du mal à suivre les explications techniques (jargon « relai », « AsyncLocalStorage » plus tard) → leçon de communication : partir du concret métier (« où le client met sa clé »), pas du mécanisme.

## Décisions prises en cours de route
- `hosting` optionnel au **type** TS (état « pas encore choisi »), requis au **schéma** Zod (force le choix) → minimise le blast-radius sur les fixtures.
- Libellés UI en **anglais** (cohérence avec l'existant), divergence FR/EN actée comme « plus tard » (cf. mémoire projet).
- L'écran de succès self-host n'est pas refait ici : reporté à une refonte unifiée avec le cloud (Pivot-5).

## Findings EVALUATE et traitement
- STANDARD, 0 bloquant/important. Dette `mode`/`hosting` (deux sources de vérité) **documentée**, à résoudre quand le générateur migrera vers `hosting`. `transportLabelFor` rendu vestigial → à nettoyer plus tard. Reportés en RETRO.

## Commentaires reviewers
- Aucun (PR auto-mergée, projet solo).
