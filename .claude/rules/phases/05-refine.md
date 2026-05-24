# Phase REFINE — Planification

## Etape 1 : Mode plan
/plan pour passer en lecture seule. Empeche d'ecrire du code pendant la planification.

## Etape 2 : Decomposer en phases
A partir de SPEC + DECISIONS + SPIKE-LOG (si applicable). Criteres :
- 1 phase = 0.5 a 2 jours OU max 5 fichiers touches
- Si plus : splitter
- Si moins (1 fichier, changement evident) : niveau "Triviale", skipper REFINE

Note niveau Standard (SPEC sautee) : la demande utilisateur tient lieu de SPEC courte. Etapes 2 et 3 en mode leger.

## Etape 3 : Couverture SPEC > PLAN (obligatoire)
- Lister chaque regle metier de la SPEC
- Pour chacune, identifier dans quelle phase et quelle tache elle est traitee
- Si une regle n'a pas de tache associee, signaler le manque et completer

Aucun PLAN.md ne peut etre redige tant que toutes les regles ne sont pas mappees a au moins une tache.

## Etape 4 : Rediger un PLAN.md par phase
Pour chaque phase, creer `.workflow/phases/NN-nom/PLAN.md` selon `PLAN-TEMPLATE.md` :
- Objectif (1 phrase)
- Fichiers impactes (chemins precis + ce qui change)
- Taches numerotees avec checkboxes
- Tests TDD a ecrire EN PREMIER (1 test par regle metier, format RED > GREEN > REFACTOR)
- Tests E2E si applicable
- UAT : scenarios de test manuel (a remplir dans UAT.md pendant DELIVER)
- Documentation a mettre a jour si applicable
- Definition of Done

## Etape 5 : Critique par /advisor
Demander :
- Ordre des taches logique (dependances respectees) ?
- Oublis manifestes (gestion d'erreur, validation d'input) ?
- Tests TDD couvrent toutes les regles metier de la couverture (Etape 3) ?
- Taille de chaque phase respecte le critere ?

Appliquer les corrections avant de continuer.

## Etape 6 : PAUSE — validation utilisateur
Presenter le PLAN critique. Attendre validation explicite avant GENERATE.

## Etape 7 : Sortir du mode plan
Une fois valide, sortir du mode plan pour entrer en GENERATE.
