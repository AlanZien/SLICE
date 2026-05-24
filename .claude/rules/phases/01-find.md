# Phase FIND — Brainstorming > PRD

## Etape 1 : Mode plan
/plan pour passer en lecture seule. Empeche toute modification de code pendant le brainstorm.

## Etape 2 : Recherche parallele de contexte (avant brainstorm)
Lancer 2-3 sous-agents en parallele :
- websearch : etat de l'art du domaine
- explore-docs (Context7 MCP) : doc des libs candidates si stack pressentie
- Explore : si code existant, inventaire du repo

Attendre les resultats avant de brainstormer.

## Etape 3 : Brainstorm structure (7 questions canoniques, dans l'ordre)
1. Quel probleme cette feature/projet resout-elle exactement ?
2. Pour qui ? (solo / equipe / public) — quel contexte ?
3. Comment saura-t-on que c'est reussi ? (critere mesurable)
4. Qu'est-ce qui est non negociable ? (perf / accessibilite / hors-ligne / securite)
5. Qu'est-ce qui est explicitement HORS scope ?
6. Quelles contraintes ? (deadline / budget / techno imposee / reglementaire)
7. Qu'est-ce qui reste flou et doit etre tranche plus tard ?

## Etape 4 : Rediger le PRD draft
Produire `.workflow/PRD.md` selon le template. Reponses + contexte de recherche.

## Etape 5 : Critique par /advisor
Demander :
- Success Criteria non mesurables ?
- Contradictions internes (Must Have qui s'excluent) ?
- Perimetre realiste vu les contraintes ?
- Questions critiques manquantes ?

Appliquer les corrections au PRD avant de continuer.

## Etape 6 : PAUSE — validation utilisateur
Presenter le PRD critique. Attendre validation explicite avant SPEC (ou BOOTSTRAP si greenfield).

## Etape 7 : Capitalisation
Extraire les decisions structurantes du PRD dans `./CLAUDE.md` (sections "Stack", "Decisions").
