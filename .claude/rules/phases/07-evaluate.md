# Phase EVALUATE — Qualite

## Etape 1 : Determiner le niveau (STANDARD ou CRITIQUE)

CRITIQUE si AU MOINS UN signal :
- Diff touche un chemin sensible : `auth/`, `payment/`, `db/migrations/`, `crypto/`, `*.security.*`, `middleware/auth*`, `routes/auth*`
- Diff modifie la gestion des secrets (lecture/ecriture de tokens, mots de passe, cles API)
- Diff modifie une regle d'autorisation/permission

Mots-cles seuls (`password`, `token`, `credential`, `secret`) ne suffisent pas — verifier le contexte (chemin + imports).

Sinon : STANDARD.

## Etape 2 : Lancer la review adaptee

**STANDARD** :
- /simplify (qualite + reuse + efficacite, corrige automatiquement)

**CRITIQUE** :
- /security-review (audit securite, confiance >= 0.8)
- /review (revue diff via gh)
- /simplify (qualite + reuse + efficacite, corrige automatiquement)

## Etape 3 : Corriger les findings
Appliquer toutes les corrections (manuellement ou via /simplify).

Filtre de severite :
- Bloquant : DOIT etre corrige avant de continuer
- Important : DOIT etre corrige
- A considerer : reporter dans `.workflow/RETRO.md` pour LEARN, ne bloque pas

## Etape 4 : Commit des corrections
- /diff pour verifier l'etat final
- /commit "refactor: apply EVALUATE findings"

## Etape 5 : Check final — tests verts
Lancer la suite complete une derniere fois.
- Si rouge : revenir corriger, ne PAS enchainer.
- Si vert : enchaine automatiquement vers DELIVER.
