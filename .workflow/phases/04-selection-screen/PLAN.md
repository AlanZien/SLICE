# Plan : Phase 04 — Écran de sélection des endpoints

Date : 2026-05-25
SPEC : .workflow/SPEC.md (section 1.2, écran 2.3)
Statut : DRAFT

## Objectif

Implémenter l'écran 2 : liste des endpoints groupés par tag, sélection par checkbox, actions bulk, recherche temps réel, sidebar récap (sans le compteur tokens calibré — phase 05).

## Fichiers impactes

- [ ] `src/client/screens/selection.tsx` — écran 2 complet
- [ ] `src/client/components/endpoint-row.tsx` — ligne d'endpoint avec checkbox + libellé + method badge + tooltip path
- [ ] `src/client/components/endpoint-group.tsx` — accordéon par tag
- [ ] `src/client/components/method-badge.tsx` — badge GET/POST/PUT/DELETE
- [ ] `src/client/components/search-box.tsx` — input recherche avec ⌘K focus
- [ ] `src/client/components/bulk-actions.tsx` — chips "Tout cocher lectures / écritures / décocher"
- [ ] `src/client/components/selection-sidebar.tsx` — sidebar sticky avec compteur (valeur placeholder en attendant phase 05) + bouton "Continuer"
- [ ] `src/client/components/api-header.tsx` — bandeau nom API + version + URL de base inline-editable
- [ ] `src/client/hooks/use-selection.ts` — state de la sélection (Set<id>) + helpers (toggle, bulk, filtre)
- [ ] `src/client/lib/keyboard.ts` — hook `useKeyboardShortcut('cmd+k', cb)`
- [ ] `src/client/App.tsx` — branche écran 2 après upload réussi

## Taches

- [ ] 1. Implémenter `useSelection(parsedSpec)` : state `Set<endpointId>`, init avec tous les GET pré-cochés (R1.2.7), helpers `toggle(id)`, `bulkCheck(filter)`, `bulkUncheck()`, `count()`, `selectedIds()`
- [ ] 2. Implémenter `<MethodBadge method>` avec couleurs SPEC 2.1 (GET/POST/PUT/DELETE) en dark + light
- [ ] 3. Implémenter `<EndpointRow>` : checkbox + libellé humain + MethodBadge + tooltip path technique (`GET /products?limit=...`) au hover. Click n'importe où sur la ligne toggle.
- [ ] 4. Implémenter `<EndpointGroup>` : header accordéon (chevron + nom tag + compteur "X/Y" sélectionnés dans le groupe), liste de EndpointRow, ouvert par défaut, click pour replier.
- [ ] 5. Implémenter `<SearchBox>` : input avec icône ⌘K leading, hook `useKeyboardShortcut('cmd+k')` qui focus l'input. Filtre client-side, p95 < 100ms sur fixture aws-500. Match case-insensitive sur label ET path.
- [ ] 6. Implémenter `<BulkActions>` : 3 chips qui appellent les helpers de `useSelection`. Respectent le filtre courant (R1.2.6 "tout cocher lectures visibles").
- [ ] 7. Implémenter `<SelectionSidebar>` : sticky, compteur "X / Y endpoints" + bignum placeholder "—%" (phase 05 le câblera), bouton "Continuer" désactivé si count==0
- [ ] 8. Implémenter `<ApiHeader>` : Fraunces italic pour nom + version, JetBrains Mono pour URL, click sur URL → mode éditable (input inline), Enter pour valider, Esc pour annuler
- [ ] 9. Implémenter `screens/selection.tsx` : layout 2 colonnes (liste 1fr + sidebar 280px), responsive (sidebar passe en bottom sheet < 768px)
- [ ] 10. Câbler navigation : "Continuer" → callback `onContinue(selectedIds)` → écran 3
- [ ] 11. Créer fixture `fixtures/aws-500.yaml` (peut être un JSON OpenAPI réel d'AWS ou une fixture générée avec 500 endpoints)

## Tests TDD

- [ ] `useSelection` initialise avec tous les GET pré-cochés (R1.2.7) — `use-selection.test.ts`
- [ ] `useSelection.toggle(id)` ajoute/retire l'id de la sélection — idem
- [ ] `useSelection.bulkCheck(filter)` ajoute les ids matchant le filtre — idem
- [ ] `useSelection.bulkUncheck()` vide la sélection — idem
- [ ] `<MethodBadge method="GET">` rend la couleur GET — `method-badge.test.tsx`
- [ ] `<EndpointRow>` toggle la sélection au click — `endpoint-row.test.tsx`
- [ ] `<EndpointRow>` affiche le tooltip path au hover — idem
- [ ] `<EndpointGroup>` se replie/déplie au click sur le header — `endpoint-group.test.tsx`
- [ ] `<SearchBox>` filtre par label et par path, case-insensitive — `search-box.test.tsx`
- [ ] `<SearchBox>` focus sur ⌘K — idem
- [ ] `<BulkActions>` "Tout cocher lectures" coche uniquement les GET visibles (respect du filtre) — `bulk-actions.test.tsx`
- [ ] `<SelectionSidebar>` désactive le bouton "Continuer" si count==0 — `selection-sidebar.test.tsx`
- [ ] `<ApiHeader>` mode édition au click URL, sauvegarde sur Enter — `api-header.test.tsx`
- [ ] `screens/selection` p95 < 100ms sur fixture aws-500 (test perf) — `selection.perf.test.ts`

## Tests E2E

- [ ] Upload spec → écran 2 → cocher 2 endpoints → Continuer → écran 3 affiché avec les bons ids

## UAT

- Spec Shopify (~30 endpoints) : 5 accordéons par tag, GET pré-cochés, bouton "Continuer" actif.
- Recherche "produit" : seuls les endpoints matchant restent visibles, sidebar count à jour.
- Click "Tout cocher écritures" : tous les POST/PUT/PATCH/DELETE visibles passent en coché.
- Tooltip path apparaît au hover sur un endpoint après 300ms.
- ⌘K focus la recherche depuis n'importe où sur la page.

## Definition of Done

- [ ] Tests TDD passent
- [ ] Test de perf sur aws-500 passe (< 100ms p95)
- [ ] /review sans problème critique
- [ ] Smoke UAT manuel avec une vraie spec
- [ ] Commit + PR
