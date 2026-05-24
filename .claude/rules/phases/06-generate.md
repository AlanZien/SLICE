# Phase GENERATE — Implementation TDD

## Etape 0 : Branche feature
Si branche courante = main/master : `git checkout -b feature/<nom-de-phase>`
Sinon : skip.

## Etape 1 : Cycle TDD par critere d'acceptation
Pour chaque critere du PLAN.md :
- RED : ecrire UN test (un seul critere) > il DOIT echouer pour la bonne raison > /commit "test: <comportement> (RED)"
- GREEN : code minimal pour faire passer > tous les tests passent > /commit "feat: <comportement> (GREEN)"
- REFACTOR : ameliorer sans changer le comportement, tests verts > /commit "refactor: <amelioration> (REFACTOR)" si refactor effectif
- Cocher la case correspondante dans PLAN.md
- Passer au critere suivant

Tests E2E si definis dans le plan, apres tous les cycles unitaires.

## Regles strictes (anti-triches TDD)
- JAMAIS de code production avant un test qui echoue.
- JAMAIS modifier un test pour qu'il passe — corriger le code, pas le test.
- JAMAIS skip / disable / xit / @Ignore un test.
- JAMAIS combiner plusieurs criteres dans un seul cycle RED/GREEN.
- Mauvaise direction > /rewind pour revenir a un etat stable.

## Gestion du blocage (3 tentatives max par tache)
Si 3 tentatives successives echouent :
1. STOP la tache courante. Ne JAMAIS boucler indefiniment.
2. Enregistrer dans `.workflow/blocked.md` :
   - Tache + critere d'acceptation
   - Resume des 3 tentatives (approche, code, message d'erreur)
   - Hypotheses sur la cause
3. Si d'autres taches independantes : les attaquer en attendant.
4. Sinon : prevenir l'utilisateur et attendre arbitrage.

## Etape 2 : Check de couverture avant EVALUATE
Avant d'enchainer :
- Toutes les cases du PLAN.md cochees
- Tous les tests TDD prevus existent et passent
- Aucune tache non resolue dans `blocked.md`

Si non satisfait : revenir aux taches manquantes ou demander arbitrage.
Si OK : enchaine automatiquement vers EVALUATE.
