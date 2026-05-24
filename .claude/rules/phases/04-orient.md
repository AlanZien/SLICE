# Phase ORIENT — Choix d'architecture (optionnelle)

## Quand activer
Pas systematique. Activer SI au moins un signal :
- SPEC mentionne une techno / lib / pattern jamais utilise dans ce projet
- /advisor en SPEC a signale un risque ou un choix non trivial
- Plusieurs solutions techniques possibles, arbitrage non evident

Sinon : passer directement a REFINE.

## Etape 1 : /advisor sur questions ouvertes
Demander :
- Quelles solutions techniques existent pour ce besoin ?
- Forces et faiblesses de chacune dans le contexte du projet ?
- Quelle est l'option recommandee, et pourquoi ?
- Y a-t-il un risque qui justifie un spike ?

Si reponse claire et fondee : enregistrer dans `DECISIONS.md`, passer a REFINE — pas besoin de spike.

## Etape 2 : Spike (uniquement si doute persistant)
1. Creer un worktree git via `EnterWorktree` (nom : "spike/<sujet>")
2. Implementer le prototype le plus minimal possible — code fonctionnel, pas joli, sans tests, jetable
3. Limite : max 2h. Si depassement, stop et arbitrage humain.
4. Tester l'hypothese (perf / integration / ergonomie)

## Etape 3 : Decision (format obligatoire)
Ecrire dans `.workflow/SPIKE-LOG.md` :
- **Question :** ce qu'on cherchait a valider
- **Approche :** ce qui a ete teste
- **Resultat :** ce qu'on a appris (chiffres, observations)
- **Decision retenue :** X
- **Raison :** Y
- **Alternatives ecartees :** Z (raison precise pour chacune)

Sans ce bloc complet, le spike n'est pas considere comme termine.

## Etape 4 : Detruire le code du spike
`ExitWorktree` avec `action: "remove"` (supprime branche + dossier).
Le code du spike n'est JAMAIS merge dans la branche principale.

## Etape 5 : Capitalisation
- Enregistrer la decision dans `.workflow/DECISIONS.md` (format ADR)
- Mettre a jour `.claude/rules/02-architecture.md` si la decision impose un nouveau pattern recurrent
