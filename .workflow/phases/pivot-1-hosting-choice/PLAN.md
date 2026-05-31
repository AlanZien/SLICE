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

- [ ] `src/shared/types.ts` — ajouter `export type DeploymentTarget = 'cloud' | 'self'` + champ `hosting?: DeploymentTarget` sur `SliceConfig` (optionnel au niveau type pour permettre l'état « non choisi »).
- [ ] `src/shared/config-schema.ts` — ajouter `hosting: z.enum(['cloud', 'self'])` (**requis** dans le schema → `isValid` faux tant que non choisi). `mode` reste, contraint par défaut à `'remote'`. Retirer/assouplir le `superRefine` qui exige la saisie de `mcpServerToken`.
- [ ] `src/client/screens/config.tsx` — remplacer le bloc « Where will your agent use it? » (3 `DestCard`) par « Where should we host it? » (2 `DestCard` pilotant `hosting`) ; libellé du bouton adapté au track ; retirer le `Field` « MCP server token » du bloc Advanced ; conserver le toggle « Detailed parameter descriptions ».
- [ ] `src/client/hooks/use-config.ts` — defaults : `hosting` non défini au départ, `mode: 'remote'` figé.
- [ ] Fixtures de test construisant un `SliceConfig` (config.test.tsx, success.test.tsx, tests générateur server) — ajouter `hosting` pour rester compilables.

## Tâches

- [ ] 1. Types : `DeploymentTarget` + `hosting` sur `SliceConfig`.
- [ ] 2. Schema : `hosting` requis ; assouplir l'exigence de saisie `mcpServerToken` ; `mode` défaut `'remote'`.
- [ ] 3. UI config.tsx : 2 cards hébergement + libellé bouton dynamique + retrait du champ token.
- [ ] 4. useConfig : defaults (`hosting` vide, `mode='remote'`).
- [ ] 5. Réparer les fixtures `SliceConfig` cassées par le nouveau champ requis.

## Tests TDD (à écrire EN PREMIER, RED → GREEN → REFACTOR)

- [ ] RC1.2 — l'écran 3 affiche **2 cards d'hébergement** « SLICE Cloud » et « Sur mon serveur », et **plus** les cards transport (« On my machine » absente) — `src/client/screens/config.test.tsx`
- [ ] RC1.3 — le bouton d'action est **désactivé** tant qu'aucune card d'hébergement n'est sélectionnée ; **activé** après sélection (champs valides) — `config.test.tsx`
- [ ] RC1.3 — le **libellé du bouton** vaut « Déployer sur SLICE Cloud » quand `hosting='cloud'`, « Générer le kit » quand `hosting='self'` — `config.test.tsx`
- [ ] RC1.4 — le champ « MCP server token » **n'apparaît plus** dans les options avancées — `config.test.tsx`
- [ ] RC1.5 — le toggle « Detailed parameter descriptions » **est toujours présent** — `config.test.tsx`
- [ ] Schema — `sliceConfigSchema` accepte `hosting: 'cloud'|'self'` et **rejette** un config sans `hosting` ; un config `hosting='cloud'` sans saisie de `mcpServerToken` reste **valide** — `src/shared/config-schema.test.ts`

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
