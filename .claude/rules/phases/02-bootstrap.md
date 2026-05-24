# Phase BOOTSTRAP — Install stack (greenfield uniquement)

Declencheur : projet greenfield (pas de package.json / pyproject.toml / Cargo.toml / equivalent) ET PRD valide.
Si projet existant : SKIP entierement, passer a SPEC.

## Etape 1 : Init git
Si pas de `.git` : `git init` apres confirmation utilisateur.

## Etape 2 : Init de la stack identifiee dans le PRD
Selon stack du PRD (avec confirmation pour chaque commande) :
- Node/Bun : `npm init -y` ou `bun init`
- Python : `poetry init` ou `uv init`
- Rust : `cargo new`
- Autre : commande adaptee

Installer les dependances principales identifiees.
Configurer le framework de tests (Vitest / Jest / Pytest / etc.) avec ses dependances.

## Etape 3 : Permissions
Lancer /permissions pour cadrer l'autonomie de Claude. Au minimum :
- Autoriser : `Bash(npm test:*)`, `Bash(npm run *)`, `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git add:*)`, `Bash(git commit:*)`
- Refuser : `Bash(rm *)`, `Bash(*--force*)`, `Bash(git push --force*)`, `Bash(git reset --hard*)`

## Etape 4 : Documentation initiale
Selon type de projet :
- Toujours : `README.md` a la racine (titre, description, installation, commandes principales, structure)
- Si API/backend : `docs/API.md` (squelette)
- Si frontend / UI prevue dans le PRD : creer `.workflow/visuals/` (vide, pret a recevoir les references visuelles fournies en SPEC)
- Si convention du projet : `CHANGELOG.md` (Keep a Changelog)

/commit "docs: initial documentation"

## Etape 5 : Mise a jour du CLAUDE.md projet
Remplir les sections "Stack", "Commandes" (dev/test/lint/build) et "Structure" avec les vraies valeurs.

## Etape 6 : Publication initiale du repo distant

Si pas de remote `origin` configure :
1. Demander a l'utilisateur s'il veut creer le repo distant maintenant :
   - Via `gh repo create <nom> --private --source=. --remote=origin` (avec confirmation)
   - Ou manuellement (l'utilisateur cree le repo sur GitHub puis configure `git remote add origin <url>`)
2. Une fois `origin` configure : premier push de `main` via `git push -u origin main` (avec confirmation utilisateur — c'est le SEUL push autorise sur `main`).

Si l'utilisateur refuse : noter que la creation de PR en DELIVER sera bloquee jusqu'a ce que `main` soit pushee manuellement.

A partir de ce moment, `main` existe sur le remote et les futures phases (DELIVER) peuvent creer des PR sans intervention.

BOOTSTRAP termine. Enchaine vers SPEC.
