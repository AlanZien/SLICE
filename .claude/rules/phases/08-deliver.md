# Phase DELIVER — Livraison

## Etape 1 : Verification finale du diff
/diff > verifier l'etat final avant push.

## Etape 2 : Documentation
Si la phase a modifie une API publique ou un comportement utilisateur visible :
- Mettre a jour le README, la doc API ou un changelog selon le projet
- /commit "docs: update <section>"

## Etape 3 : UAT
Ajouter une section dans `.workflow/UAT.md` :
- Tests techniques generes par Claude depuis le PLAN.md de la phase
- Section vide pour tests metier utilisateur (a completer plus tard, non bloquant)
- /commit "docs: add UAT for phase <nom>"

## Etape 4 : Push de la branche feature
REGLE STRICTE : DELIVER ne push JAMAIS sur main/master, meme avec ordre explicite.
- Verifier que la branche courante n'est PAS main/master. Si c'est le cas, refuser et exiger une branche feature.
- Push : `git push -u origin <branche-feature>`

## Etape 5 : Creation de la PR
`gh pr create` avec description obligatoire au format :

```
## Summary
<1-3 lignes : ce que cette PR fait et pourquoi>

## Changes
- <fichier ou module modifie — quoi>
- <fichier ou module modifie — quoi>

## Test plan
- [ ] <comment verifier en local>
- [ ] <comment verifier en navigateur si UI>

## UAT
Voir .workflow/UAT.md section "<nom de la phase>"
```

Si une PR existe deja sur la branche, l'updater (`gh pr edit`) au lieu d'en creer une nouvelle.

## Etape 6 : Liberer le contexte
/compact pour preparer la suite.

## Etape 7 : Proposer la prochaine feature
Lire `.workflow/BACKLOG.md` et proposer la premiere case non cochee.
Si BACKLOG vide : demander a l'utilisateur quelle feature attaquer.
