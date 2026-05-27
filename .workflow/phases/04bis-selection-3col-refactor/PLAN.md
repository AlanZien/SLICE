# Plan : Phase 04bis — Refonte écran 2 (layout 3-col Raycast)

Date : 2026-05-28
SPEC : `.workflow/SPEC.md` §2.3 + **maquette `.workflow/visuals/slice-design-system/project/hifi-screen-2.jsx`** (source de vérité visuelle).
Statut : DRAFT

## Pourquoi cette phase

Phase 04 a livré un écran 2 en **2-col (accordéons + sidebar droite)** en suivant le wireframe ASCII du SPEC.md. La maquette JSX validée par l'utilisateur dans `hifi-screen-2.jsx` décrit un **3-col Raycast split** (rail tags gauche + liste centrale + panneau aperçu droite). Drift entre SPEC texte et maquette ; la maquette est la source de vérité visuelle. À aligner avant phase 06 pour ne pas propager le mauvais pattern.

## Objectif

Refactorer `screens/selection.tsx` et ses composants en respectant la maquette : rail tags à gauche avec navigation tag-by-tag, liste centrale plate filtrée par tag actif, panneau aperçu à droite pour l'endpoint focusé, footer sticky avec résumé + Continue, bignum % économisé dans le bas du rail gauche.

## Fichiers impactés

- **NEW** `src/client/components/tag-rail.tsx` — sidebar gauche : eyebrow "tags" + RailItem "Tous" + `<RailItem>` par tag avec compteurs `picked/total`, divider, footer "Context saved" bignum
- **NEW** `src/client/components/endpoint-preview.tsx` — panneau aperçu droite : eyebrow "preview" + méthode + path + label + description + section paramètres + section "context cost" + bouton "Add to MCP" / "Included in MCP"
- **NEW** `src/client/components/filter-chips.tsx` — toggle `All / Reads / Writes` (filter mode, distinct des bulk actions)
- **NEW** `src/client/components/sticky-footer.tsx` — footer "← Back" + résumé "X endpoints · −Y% context" + "Continue ↵"
- **REFACTOR** `src/client/screens/selection.tsx` — layout 3-col, état `focusedId`, `activeTag`, suppression accordéons
- **REFACTOR** `src/client/components/endpoint-row.tsx` — row plate cliquable (focus) + checkbox click-to-toggle, path inline, tokens à droite, état `isActive` (focused)
- **DEPRECATE** `src/client/components/endpoint-group.tsx` — supprimé (plus d'accordéons)
- **DEPRECATE** `src/client/components/selection-sidebar.tsx` — content déplacé vers `tag-rail` (économie) + `sticky-footer` (continue + résumé). Composant supprimé.
- **DEPRECATE** `src/client/components/economy-counter.tsx` — intégré dans `tag-rail` ; supprimé ou refactor en sous-composant interne
- **DEPRECATE** `src/client/components/bulk-actions.tsx` — bulks deviennent ghost buttons dans la action bar, plus de chips dédiées. Soit refactor du composant, soit suppression + inline dans selection.tsx
- **UPDATE** `src/client/hooks/use-selection.ts` — ajoute `focused: string | null` + `setFocused(id)` (état UI piloté par le rail/list/preview)
- **UPDATE** `src/client/components/method-badge.tsx` — vérifier l'utilisation dans `<EndpointPreview>` (probablement OK tel quel)

## Tâches

- [ ] 1. Créer `<TagRail>` avec `<RailItem>` interne. Props : `tags: TagCount[]`, `activeTag: string`, `onSelectTag(name)`, `savedPercent: number`, `selectedCount: number`, `totalCount: number`, `sliceTokens: number`, `fullTokens: number`. Item "Tous" en haut (active = afficher tous les tags fusionnés). Footer avec bignum `-XX%` Fraunces italic + progress bar + lignes `sélectionnés X/Y` + `tokens X / Y`.
- [ ] 2. Créer `<EndpointPreview endpoint={focusEp} selected={isSelected} onToggle()>` : path en font-mono, label en h3, description, params (name / type · required), tokens estimés grossis, bouton primary toggle (état différent selon picked).
- [ ] 3. Créer `<FilterChips value={'all'|'read'|'write'} onChange()>` : 3 chips avec état actif visuel distinct.
- [ ] 4. Créer `<StickyFooter onBack onContinue selectedCount savedPercent>` : layout flex `← Back` + grow + `résumé`(font-mono) + `Continue ↵`(primary).
- [ ] 5. Refactor `<EndpointRow>` : params (focused, selected, onToggleSelect, onFocus). Layout : `[checkbox] [METHOD] /path/{id}    label                              ~ XX tk`. `aria-pressed` reflète focused, checkbox indépendante.
- [ ] 6. Update `useSelection` pour exposer `focused: string | null`, `setFocused(id: string | null)`. Aussi exposer `tagCounts: Map<string, {picked, total}>` mémoisé pour le rail.
- [ ] 7. Refactor `<SelectionScreen>` :
  - Layout : `flex-row` avec rail (200px) + section flex-1 + preview (290px) + footer sticky en dessous
  - États : `activeTag` (default = premier tag), `query` (scopé au tag), `filterMode` (all/read/write), `selection.focused`
  - Liste centrale = endpoints du tag actif filtrés par query + filterMode
  - Sur clic d'une row : `setFocused(ep.id)` (ne toggle pas)
  - Sur clic de la checkbox : `selection.toggle(ep.id)` (ne focus pas)
  - Continue désactivé si count == 0
- [ ] 8. Câbler bulk actions dans la action bar centrale (au-dessus de la liste) en ghost buttons : `↓ reads`, `↑ writes`, `∅ all` (compact, sans chip).
- [ ] 9. Wire footer sticky avec onBack (retour écran 1, reset), résumé live, Continue avec raccourci `↵`.
- [ ] 10. Vérifier que `excludedCount` et `deprecatedCount` + toggle deprecated trouvent leur place (probablement dans le footer du tag rail, sous le bignum).
- [ ] 11. Supprimer fichiers obsolètes : `endpoint-group.tsx`, `selection-sidebar.tsx`, `economy-counter.tsx` (et leurs tests si non couverts par les nouveaux). Mettre à jour `App.tsx` si besoin.
- [ ] 12. Tests E2E : upload spec → cliquer un tag → checker un endpoint → preview pane à jour → Continue.

## Tests TDD

- [ ] `<TagRail>` rend `Tous` + un item par tag avec compteur `picked/total`
- [ ] `<TagRail>` highlight le tag actif (`active` prop)
- [ ] `<TagRail>` appelle `onSelectTag` au click
- [ ] `<TagRail>` affiche le bignum `-XX%` et le progress bar
- [ ] `<EndpointPreview>` affiche méthode + path + label + description
- [ ] `<EndpointPreview>` affiche "no params" si vide
- [ ] `<EndpointPreview>` bouton `+ Add to MCP` → `onToggle` quand non sélectionné, `✓ Included` quand sélectionné
- [ ] `<FilterChips>` affiche les 3 modes, fires `onChange`
- [ ] `<StickyFooter>` désactive Continue si count==0
- [ ] `<StickyFooter>` raccourci `Enter` déclenche Continue
- [ ] `<EndpointRow>` clic row → onFocus, clic checkbox → onToggle (pas de double-fire)
- [ ] `useSelection.setFocused(id)` met à jour `focused`, `setFocused(null)` clear
- [ ] `useSelection.tagCounts` retourne le bon mapping pour chaque tag
- [ ] `<SelectionScreen>` change la liste centrale au changement de tag
- [ ] `<SelectionScreen>` filtre par query dans le tag actif uniquement
- [ ] `<SelectionScreen>` FilterChips applique read/write filter dans le tag actif
- [ ] `<SelectionScreen>` clic d'une row met à jour le preview pane
- [ ] `<SelectionScreen>` initial focus = première row du premier tag
- [ ] `<SelectionScreen>` Continue passe selectedIds à `onContinue`

## UAT

- Upload `fixtures/shopify-50.yaml` → écran 2 en 3-col : rail gauche avec 10 tags, liste Products visible, preview du premier endpoint à droite, bignum %
- Click sur "Orders" dans le rail → liste centre change, preview pane reste sur le précédent focus (acceptable) ou suit le premier endpoint du nouveau tag (à trancher en UAT)
- Click sur une row → preview pane affiche cet endpoint
- Click sur la checkbox → toggle sélection, preview ne change pas
- Click "↓ reads" → tous les GET du tag actif visibles cochés
- Search "products" dans le tag Products → liste filtre
- Continue désactivé si tout décoché
- Toggle Show deprecated reste fonctionnel (positionnement à trancher : footer rail ou action bar ?)

## Documentation

- [ ] Mettre à jour `.workflow/SPEC.md` §2.3 — remplacer le wireframe ASCII par la maquette 3-col (ou supprimer le wireframe et pointer vers la maquette JSX)
- [ ] Ajouter dans `.workflow/RETRO.md` la leçon "maquette JSX = source de vérité visuelle, SPEC texte = source de vérité métier" (pas re-faire l'erreur sur écrans 3-4)

## Definition of Done

- [ ] Tests TDD passent (cible : 180+/180+)
- [ ] Aucun composant obsolète ne reste (endpoint-group, selection-sidebar)
- [ ] /review sans problème critique
- [ ] UAT visuel : screenshot comparé à la maquette `hifi-screen-2.jsx`
- [ ] Commit + PR
