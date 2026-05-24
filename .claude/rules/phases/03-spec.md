# Phase SPEC — Specifications

## Etape 1 : SPEC fonctionnelle
Produire `.workflow/SPEC.md` :
- Comportements, regles metier, cas nominaux, cas d'erreur, cas limites
- Chaque regle DOIT etre testable : chiffrer (latence, volume, taille), preciser conditions et resultats
  Exemple : "performante" > "la recherche retourne en moins de 200ms sur 10 000 taches"
- Si une regle ne peut pas etre traduite en au moins 1 test (cas nominal + cas d'erreur), la raffiner avant de continuer.

## Etape 2 : SPEC visuelle (si frontend)
Optionnel — uniquement si UI.

### Sous-etape 2.1 : Visuels de reference

Avant de rediger les wireframes, demander a l'utilisateur :
- As-tu des visuels de reference (mockups, screenshots d'apps similaires, croquis, exports Figma) ?
- Si oui : dans quel dossier les mettre ? (proposer `.workflow/visuals/` par defaut, deja cree en BOOTSTRAP si frontend)

Si l'utilisateur fournit des fichiers :
- Les analyser via Read (Claude Code lit les PNG, JPG, PDF nativement)
- Extraire : palette de couleurs, typographie, hierarchie visuelle, patterns d'interaction, layouts
- Reutiliser ces observations dans la suite de la SPEC visuelle

Si pas de visuels : continuer avec wireframes ASCII uniquement.

### Sous-etape 2.2 : Description des ecrans
- Description des ecrans, composants, etats (Default / Loading / Empty / Error)
- Wireframe ASCII (informe par les visuels de reference si fournis)
- Responsive (mobile / desktop)
- Accessibilite (ARIA, navigation clavier, contraste)

## Etape 3 : Parcours utilisateur
Decrire les flux principaux entre ecrans / etats :
- Comment l'utilisateur passe d'un ecran a l'autre
- Quelles actions declenchent quels comportements
- Comment les ecrans communiquent (drag & drop, navigation, modales)

Exemple : "Depuis le calendrier > clic sur cellule > ouvre la modale 'ajouter une tache pour ce jour'".

## Etape 4 : Critique par /advisor
Demander :
- Regles metier non testables (vagues) ?
- Contradictions internes (Must Have qui s'excluent) ?
- Cas d'erreur ou cas limites manquants ?
- Coherence avec le PRD valide ?

Appliquer les corrections avant de continuer.

## Etape 5 : PAUSE — validation utilisateur
Presenter la SPEC critiquee. Attendre validation explicite avant ORIENT (si applicable) ou REFINE.
