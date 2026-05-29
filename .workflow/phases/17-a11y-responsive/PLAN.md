# Plan : Phase 12 — Accessibilité + Responsive

Date : 2026-05-25
SPEC : .workflow/SPEC.md (sections 2.2–2.5 a11y + responsive)
Statut : DRAFT

## Objectif

Valider et compléter l'accessibilité (WCAG AA, navigation clavier, ARIA, reduced motion) et le responsive (mobile/tablette/desktop) des 4 écrans bout-en-bout. Cette phase audite et corrige ; elle n'introduit pas de nouveaux écrans.

## Fichiers impactes

- [ ] `src/client/index.css` — focus rings visibles, breakpoints utilitaires
- [ ] `src/client/components/topbar.tsx` — stepper compact mobile (numéros seuls)
- [ ] `src/client/screens/upload.tsx` — dropzone responsive
- [ ] `src/client/screens/selection.tsx` — sidebar bottom sheet mobile (déplacé depuis phase 04)
- [ ] `src/client/screens/config.tsx` — cards en column mobile
- [ ] `src/client/screens/success.tsx` — tabs scrollables horizontalement mobile

## Taches

### Accessibilité

- [ ] 1. Audit clavier complet : Tab traverse tous les interactifs dans l'ordre logique, Enter/Space activent, Esc ferme tooltips/menus
- [ ] 2. Focus visible : outline 2px var(--ink) sur tous les éléments interactifs (boutons, inputs, cards, checkboxes, tabs, rows, accordéons)
- [ ] 3. Compléter les attributs ARIA manqués :
  - Écran 1 : Dropzone `role=button`, `aria-label`, `aria-describedby` pour message d'aide
  - Écran 2 : EndpointRow `role=checkbox` + `aria-checked`, EndpointGroup `aria-expanded`, SearchBox `role=searchbox`, compteur `aria-live=polite`
  - Écran 3 : ModeCard `role=radio` dans `role=radiogroup`, AuthRadio `aria-labelledby`, inputs `aria-describedby` pour erreurs
  - Écran 4 : Tabs `role=tablist`, navigation flèches, `aria-selected`, CodeSnippet `role=region` + `aria-label`, Toast `role=status`/`role=alert`
- [ ] 4. Trancher comportement ⌘K si focus déjà sur SearchBox : sélectionne tout le contenu de l'input (comportement standard d'éditeurs)
- [ ] 5. Contraste : audit Lighthouse a11y sur les 4 écrans en dark ET light, viser ≥ 95
- [ ] 6. `prefers-reduced-motion: reduce` : audit toutes les anims (CheckAnim phase 10, dot-pulse, fade-in entre écrans, dropzone hover transform, transitions topbar). Tout `motion-safe:` côté Tailwind, fallback statique partout
- [ ] 7. Annonces `aria-live` :
  - Compteur d'économie écran 2 (`aria-live=polite`)
  - Toast succès (`role=status`)
  - Toast erreurs (`role=alert`)
  - Bouton "Copier" → "Copié" (`aria-live=polite`)

### Responsive

- [ ] 8. Breakpoints Tailwind : `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
- [ ] 9. Écran 1 : dropzone max-width 640px (≥ lg), 480px (md), full width (sm)
- [ ] 10. Écran 2 : sidebar sticky droite (lg), bandeau fixe en bas (md), bottom sheet collapse (sm). **Décision transverse** : tout le responsive sidebar est traité ici, pas dans phase 04.
- [ ] 11. Écran 3 : cards mode en row (lg, md), en column (sm)
- [ ] 12. Écran 4 : tabs scrollables horizontalement (sm), code block scroll horizontal partout sur overflow
- [ ] 13. Topbar : stepper compact mobile (numéros seuls, pas de noms d'étapes), hint ⌘K masqué sur sm
- [ ] 14. Tester en viewport 375×667 (iPhone SE) et 768×1024 (iPad) que tout reste utilisable

## Tests TDD

- [ ] Snapshot a11y axe-core sur écran 1 — `e2e/a11y.test.ts`
- [ ] Snapshot a11y axe-core sur écran 2 — idem
- [ ] Snapshot a11y axe-core sur écran 3 — idem
- [ ] Snapshot a11y axe-core sur écran 4 — idem
- [ ] Test viewport mobile : sidebar passe en bottom sheet < 768px — `selection.responsive.test.tsx`
- [ ] Test viewport mobile : cards mode en column — `config.responsive.test.tsx`
- [ ] `prefers-reduced-motion: reduce` mocké → CheckAnim sans animation — `check-anim.test.tsx` (renforcé)
- [ ] ⌘K avec focus déjà sur SearchBox → sélection du contenu — `search-box.test.tsx` (étendu)

## Tests E2E

- [ ] Parcours complet upload→sélection→config→génération→snippet copié en **navigation 100% clavier** (zéro souris)
- [ ] Parcours complet en **viewport 375×667** : tout fonctionnel
- [ ] Parcours complet avec **prefers-reduced-motion: reduce** : aucune anim, parcours fonctionnel

## UAT

- Audit Lighthouse a11y ≥ 95 sur chaque écran (dark et light).
- Test VoiceOver (macOS) ou NVDA : narration correcte sur sélection, génération, copie.
- Test iPhone réel (Safari) : parcours upload → succès fonctionnel.
- Test iPad : layout intermédiaire correct.

## Documentation

- [ ] README : section "Accessibilité" listant les engagements (WCAG AA, clavier, ARIA, reduced motion)

## Definition of Done

- [ ] Tests TDD a11y et responsive passent
- [ ] Lighthouse a11y ≥ 95 sur les 4 écrans en dark + light
- [ ] Parcours clavier-only complet validé
- [ ] Parcours mobile complet validé
- [ ] /review sans problème critique
- [ ] Commit + PR
