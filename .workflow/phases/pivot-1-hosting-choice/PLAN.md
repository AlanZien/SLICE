# Plan : Phase Pivot-1 — Écran « Où héberger ? »

Date : 2026-05-31
SPEC : .workflow/SPEC-CLOUD.md (RC1)
Statut : DRAFT

## Objectif

Remplacer, sur l'écran 3, la question « Où ton agent va l'utiliser ? » (3 cards transport) par « Où héberger ton MCP ? » (2 cards : SLICE Cloud / Sur mon serveur), sans casser le générateur en aval.

## Principe technique (décision de cette phase)

- Introduction d'un champ **`hosting: 'cloud' | 'self'`** dans `SliceConfig`, **non sélectionné par défaut** (RC1.3).
- Le champ **`mode`** (`local|remote|both`) est **conservé mais retiré de l'UI** et **forcé à `'remote'`** : les deux tracks hébergés sont HTTP. Le générateur MCP continue donc de fonctionner à l'identique (dette temporaire : `mode` sera retiré quand snippets/générateur basculeront en logique `hosting`, phases Pivot-2+).
- Le `mcpServerToken` reste **auto-généré en interne** (déjà dans `defaultConfig`) mais **n'est plus affiché ni éditable** (RC1.4). Son usage réel (gardé en self, ignoré en cloud) est traité en Pivot-2/4.

## Fichiers impactés

- [x] `src/shared/types.ts` — `DeploymentTarget = 'cloud' | 'self'` + `hosting?: DeploymentTarget` sur `SliceConfig`.
- [x] `src/shared/config-schema.ts` — `hosting` requis ; `superRefine` token retiré (token optionnel quel que soit le mode).
- [x] `src/client/screens/config.tsx` — 2 `DestCard` hébergement, libellé bouton dynamique, retrait du `Field` token, toggle descriptions conservé.
- [x] `src/client/hooks/use-config.ts` — defaults : `hosting` undefined, `mode: 'remote'`.
- [x] Fixtures `SliceConfig` (use-config.test, config-schema.test, generate.test, generate.perf.test) — `hosting` ajouté / contrat mis à jour.

## Tâches

- [x] 1. Types : `DeploymentTarget` + `hosting` sur `SliceConfig`.
- [x] 2. Schema : `hosting` requis ; token non requis ; `mode` défaut `'remote'`.
- [x] 3. UI config.tsx : 2 cards hébergement + libellé bouton dynamique + retrait du champ token.
- [x] 4. useConfig : defaults (`hosting` vide, `mode='remote'`).
- [x] 5. Réparer les fixtures `SliceConfig` cassées par le nouveau champ requis.

## Tests TDD (écrits EN PREMIER, RED → GREEN)

- [x] RC1.2 — l'écran 3 affiche 2 cards d'hébergement et plus les cards transport — `config.test.tsx`
- [x] RC1.3 — bouton désactivé tant qu'aucune card choisie ; activé après — `config.test.tsx`
- [x] RC1.3 — libellé bouton « Deploy to SLICE Cloud » (cloud) / « Download the kit » (self) — `config.test.tsx`
- [x] RC1.4 — le champ « MCP server token » n'apparaît plus — `config.test.tsx`
- [x] RC1.5 — le toggle « Detailed parameter descriptions » est toujours présent — `config.test.tsx`
- [x] Schema — `hosting` requis, token optionnel quel que soit le mode — `config-schema.test.ts`

> Note libellés : l'UI existante est en anglais ; les cards/boutons sont donc en anglais (« SLICE Cloud » / « On my server »), pas en français comme les wireframes de la SPEC. Divergence FR/EN pré-existante à arbitrer hors P1.

## Tests E2E

> Non applicable à cette phase (UI isolée, pas de parcours complet nouveau). Le parcours bout-en-bout est couvert quand l'écran 4 sera refondu (Pivot-3/5).

## UAT (à remplir dans .workflow/UAT.md pendant DELIVER)

- Ouvrir l'écran 3 : vérifier les 2 cards d'hébergement, le bouton grisé au départ.
- Cliquer « SLICE Cloud » → le bouton s'active et lit « Déployer sur SLICE Cloud ».
- Cliquer « Sur mon serveur » → le bouton lit « Générer le kit ».
- Déplier les options avancées : plus de champ token, le toggle descriptions est là.

## Documentation

- [ ] Aucune doc publique impactée à ce stade (comportement final visible une fois l'écran 4 refondu). Note interne suffisante dans la SPEC.

## Definition of Done

- [ ] Tous les tests TDD passent (GREEN)
- [ ] `pnpm typecheck` strict clean (fixtures réparées)
- [ ] Suite complète verte (aucune régression sur les écrans aval)
- [ ] /review sans problème critique
- [ ] Code commité et PR créée sur branche `feature/pivot-1-hosting-choice`
- [ ] UAT.md mis à jour

---
Généré par le workflow FORGE (phase REFINE — pivot SLICE Cloud). Validé par l'utilisateur avant GENERATE.
