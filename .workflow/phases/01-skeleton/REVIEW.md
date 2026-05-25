# Retrospective : Phase 01 — Squelette

Date : 2026-05-25
Branche : `feature/01-skeleton`
PR : #1 — merged dans `main`

## Ce qui a bien fonctionné

- **TDD discipliné** : 4 cycles RED → GREEN proprement séparés en commits atomiques distincts (useTheme, Stepper, Topbar, /api/health). Aucun cycle combiné. Le pattern est clair et reproductible pour les phases suivantes.
- **Couverture spec → plan → test** : la matrice `COVERAGE.md` a aidé à vérifier que rien n'était orphelin avant le code. Aucune règle SPEC ne s'est révélée non couverte pendant le dev.
- **EVALUATE rapide et utile** : audit STANDARD a sorti 3 Important + 6 À considérer en quelques minutes. Tous les 3 Important corrigés en < 10 minutes, sans casser un seul test.
- **Découplage `app.ts` / `index.ts`** : extraire `createApp()` a permis de tester `/api/health` avec supertest sans binder de port. Pattern à généraliser pour toutes les routes des phases suivantes.
- **shadcn-compatible mapping des tokens SLICE** : on a évité de réécrire les composants shadcn en mappant `--background`, `--foreground`, etc. vers les vars `--slice-*`. Les composants Card/Button/Input restent utilisables out-of-the-box.

## Ce qui a été difficile / surprenant

- **Le repo était déjà bootstrappé** alors que CLAUDE.md disait "Phase en cours : FIND validé, prochaine étape BOOTSTRAP". Décalage entre l'état réel et l'état déclaré. La session a perdu ~5 min à inspecter ce qui existait déjà.
  - **Action** : à chaque début de phase, vérifier `package.json` + `src/` + `git log` AVANT de présumer de l'état.
- **Variations entre PLAN et code sur la réponse `/api/health`** : le PLAN disait `{ok: true}`, le code (bootstrappé avant la SPEC) disait `{status: 'ok'}`. Détecté seulement en EVALUATE. Si l'advisor n'avait pas relu le PLAN ligne par ligne, le drift serait passé.
  - **Action** : pendant la rédaction des tests TDD, lire la règle SPEC ET le PLAN pour éviter qu'un test ne valide que le code existant.
- **Dev shortcuts non gated** dès le départ. Le commentaire "removed in phase 02" aurait pu être oublié.
  - **Action** : `import.meta.env.DEV` est désormais le réflexe pour toute UI temporaire.

## Décisions prises en cours de route

- **`/api/health` exempté du rate-limit** (EVALUATE finding) — décision finalisée dans le code et documentée dans `docs/API.md`. À reporter dans la SPEC de la phase 11 (sécurité) pour figer la liste des exemptions.
- **Réponse `/api/health` retourne `ok: true` ET `status: 'ok'`** pour cohérence PLAN + UX dev.
- **Pattern `cn()` non systématique** : `topbar.tsx` et `stepper.tsx` utilisent encore `[].filter(Boolean).join(' ')`. Pas corrigé en phase 01 (non bloquant), à uniformiser au prochain refactor naturel.

## Findings EVALUATE traités

### Bloquant : 0

### Important corrigés : 3
- Exempt `/api/health` from rate-limit
- Add `ok: true` to health response
- Gate dev shortcuts behind `import.meta.env.DEV`

### À considérer reportés dans `.workflow/RETRO.md`
- CORS global ouvert (à traiter en phase 11)
- Body limit global (à reconfigurer en phase 02 et 08)
- Inline FOUC script (à transformer en script externe en phase 11)
- Pattern `cn()` non uniforme (à uniformiser au fil)
- Padding topbar 20 vs 18 px (à reconfirmer en phase 12)
- Couverture tests incomplète sur 404/rate-limit/static (à observer)

## Patterns récurrents détectés

**Seuil = 3 occurrences pour promouvoir en règle dans `.claude/rules/`.**

Phase 01 est la première — pas encore de pattern récurrent à promouvoir. À observer en phases 02, 03, 04 :
- Inadéquation PLAN ↔ code préexistant (1 occurrence)
- Pattern de concat de classes verbeux au lieu de `cn()` (1 occurrence, 2 fichiers)
- Body/CORS config globale par défaut au lieu de granulaire (1 occurrence)

Si l'un d'eux atteint 3 occurrences en phase 02–04, il sera promu en règle.

## Commentaires reviewers

PR #1 mergée sans commentaires de review (merge solo).

## Conclusion

Phase 01 atterrit propre, à temps (1.5 j estimé, fait en ~3 h chrono avec interaction). La méthode TDD strict + EVALUATE STANDARD + DELIVER cadré fonctionne bien sur une phase squelette. Prochain test du dispositif : phase 02 (parsing OpenAPI, sécurité plus exigeante).
