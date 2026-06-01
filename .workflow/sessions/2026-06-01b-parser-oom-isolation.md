# Session 2026-06-01 (suite) — Isolation OOM du parsing, de la SPEC au merge

Suite de la session du jour. Après avoir cadré l'OOM (cf. `2026-06-01-body-forwarding-corpus-oom.md`), on a déroulé la phase complète jusqu'au merge.

## Cycle FORGE complet (parser-oom-isolation, PR #24 mergée)

- **SPEC** `.workflow/SPEC-PARSER-OOM.md` + 1 passe /advisor (3 hypothèses non vérifiées → spike requis).
- **ORIENT (spike, ~2h)** : prototypes jetables. Résultats (SPIKE-LOG + D004) :
  - `$ref` bomb fan-out non-cyclique OOM bien `parseSpec` (fixture déterministe).
  - **worker_threads écarté** : résolution de module cassée sous tsx.
  - **child_process validé** : bombe → enfant OOM (SIGABRT), **parent survit**, code d'erreur préservé.
  - **Finding** : OOM capé met ~132 s → le **timeout-kill est la garde primaire**, le cap mémoire le filet.
- **REFINE** : PLAN + 1 passe /advisor (3 bloquants fermés : chemin child prod, code aplati sur generate/host, smoke Vitest ; + concurrence, OOM-hors-CI, garde 10 MB, env nettoyé).
- **GENERATE** (TDD strict, T1-T6) : `parse-isolated.ts` (spawn + timeout-kill + cap mémoire + sémaphore + classifieur), `parse-child.ts`, fixture `ref-bomb`, codes `PARSE_TOO_COMPLEX`/`PARSE_BUSY`, intégration upload+reparse. 459 tests verts.
- **EVALUATE CRITIQUE** : security-review (0 bloquant ; 2 durcissements appliqués : env enfant allowlisté, cap stdout), /simplify (`MAX_SPEC_BYTES` partagé, `KNOWN_CODES` supprimé ; unification contrat d'erreur tracée).
- **DELIVER** : PR #24, UAT.md, mergée.
- **LEARN** : REVIEW.md + règle promue dans `03-testing.md` (« valider contre la réalité avant tout claim prod »).

## Findings prod surfacés (par validation méthodique)
1. **OOM parser** (corpus check) → ✅ corrigé (PR #24).
2. **Build prod cassé** (smoke T6) : `node dist/...` ne démarre pas (imports ESM sans extension + alias `@shared`, pré-existant). → nouveau **PROD-CRITIQUE**, tracé, non corrigé.

## Pattern promu (LEARN)
La validation contre la réalité (UAT live, corpus, spike, smoke build prod) surface systématiquement des blocages invisibles aux tests verts. Règle ajoutée à `03-testing.md` : avant tout claim « prod », valider entrées réelles + vrai chemin de build + vrai client ; inconnue technique → spike d'abord.

## État du repo en fin de session
- `main` : Pivots 1-4 + body forwarding + isolation OOM mergés. 459 tests verts, typecheck clean.
- Branche `docs/learn-parser-oom` : REVIEW + règle 03-testing + CLAUDE.md à jour + ce résumé (à merger).
- **Le build prod ne tourne toujours pas** (pré-existant) — c'est le prochain blocage #1.

## Reprise prochaine session
1. Merger la PR docs LEARN.
2. **Réparer le build prod** (PROD-CRITIQUE #1) : bundler (esbuild/tsup) ou `tsc-alias` + extensions `.js` ; rendre `parse-child.js` lançable standalone. Sans ça rien ne se déploie.
3. Puis **OAuth amont** (plus gros levier de couverture API).

## Note
Le serveur `pnpm dev` a pu être relancé par l'utilisateur — à couper. Jeton Notion de test à révoquer (exposé dans le chat + config Claude Desktop).
