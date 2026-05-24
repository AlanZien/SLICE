# Phase LEARN — Retro

## Quand declencher
APRES le merge de la PR — pas tout de suite apres DELIVER :
- Soit automatiquement quand l'utilisateur revient sur Claude apres avoir merge
- Soit manuellement quand l'utilisateur dit "lance la retro de la phase XYZ"

Ne PAS lancer si la PR est encore ouverte — il manque les commentaires reviewers.

## Etape 1 : Rassembler les inputs
- PRD.md, SPEC.md, PLAN.md de la phase concernee
- Commits de la branche feature
- Commentaires de la PR : `gh api repos/OWNER/REPO/pulls/N/comments`
- Findings "a considerer" accumules dans `.workflow/RETRO.md` pendant EVALUATE
- Code produit + corrections appliquees

## Etape 2 : Ecrire `.workflow/phases/NN/REVIEW.md`
Synthese de la phase :
- Ce qui a bien fonctionne
- Ce qui a ete difficile (blocages, allers-retours, malentendus)
- Decisions prises en cours de route
- Findings "a considerer" d'EVALUATE et leur traitement (promu en regle / ajoute au backlog / ecarte)
- Commentaires reviewers significatifs

## Etape 3 : Detecter les patterns recurrents (seuil = 3 occurrences)
Comparer REVIEW.md de cette phase avec REVIEW.md des phases passees + commentaires PR + findings "a considerer".

Si meme type de probleme apparait au moins 3 fois (toutes sources confondues) :
- Promu en regle dans `.claude/rules/` (01-conventions / 02-architecture / 03-testing selon le sujet)
- Mentionner dans la regle : "issu de LEARN apres N occurrences detectees"

Sinon : ne pas promouvoir, garder comme finding pour les phases suivantes.

## Etape 4 : Mettre a jour `.workflow/RETRO.md`
Ajouter une section pour la phase :
- Date + nom de la phase
- Synthese tres courte (3-5 lignes)
- Patterns recurrents detectes (et promus en regle si applicable)
- Reference vers `.workflow/phases/NN/REVIEW.md` pour le detail

RETRO.md est append-only — historique preserve.

## Etape 5 : Alimenter le BACKLOG
Si pendant la phase, des idees d'amelioration ou de futures features ont emerge (commentaires PR, conversations, findings non promus en regle) :
- Les ajouter dans `.workflow/BACKLOG.md` dans la section appropriee
- Format : `- [ ] <idee> (issu de phase NN)`

## Etape 6 : Commit et fin
- /commit "docs: LEARN retro for phase NN"
- LEARN termine. Le projet est pret pour la prochaine phase ou une nouvelle iteration FIND.
