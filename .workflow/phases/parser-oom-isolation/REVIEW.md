# REVIEW — Isolation mémoire du parsing (anti-OOM / anti-DoS)

PR #24 (mergée). 459 tests verts. Décision D004. Spike : SPIKE-LOG 2026-06-01.

## Ce qui a bien fonctionné

- **Le spike ORIENT a évité un mur.** L'approche évidente (worker_threads + resourceLimits) **ne marche pas** ici (résolution de module cassée sous tsx). 2h de spike l'ont prouvé AVANT d'écrire la vraie implémentation, et ont fait pivoter vers child_process. Sans le spike, on aurait codé une journée dans une impasse.
- **Le timeout-kill > cap mémoire.** Le spike a aussi révélé que l'OOM capé met ~132 s (thrash GC) → le wall-clock timeout qui tue l'enfant est la vraie garde rapide, le cap mémoire n'est qu'un filet. Contre-intuitif, et ça a structuré tout le design.
- **2 passes /advisor (SPEC + PLAN) ont fermé des pièges prod** avant le code : chemin du child en prod (double `dist/server/server/`), code d'erreur aplati sur generate/host, OOM-pur à sortir de la CI (flaky), garde 10 MB avant spawn, env nettoyé.
- **TDD strict** : le test « bombe → PARSE_TIMEOUT → serveur survit » prouve l'invariant clé de façon déterministe et rapide (timeout court, pas d'attente d'un OOM de 132 s).

## Ce qui a été difficile / découvert

- **T6 (smoke build prod) a révélé que le build prod ne démarre pas du tout** — pré-existant (imports ESM sans extension `.js` + alias `@shared`). SLICE marche en dev (tsx tolère) mais `pnpm start` est cassé depuis toujours. Nouveau blocage PROD-CRITIQUE, distinct de l'OOM, tracé au BACKLOG.
- **Scope qui s'étend par la validation réelle** : la phase devait « isoler le parsing », elle a aussi surfacé le build prod cassé. C'est le coût (sain) de vérifier vraiment l'état prod plutôt que de supposer.

## Pattern récurrent (cette session) — la validation méthodique surface les vrais blocages prod

Sur cette session, à chaque fois qu'on a **validé contre la réalité** plutôt que de se fier aux tests verts, on a trouvé un vrai blocage prod invisible aux tests unitaires :
1. **UAT live Notion** → bug du flag `required` sur les champs de body (459 tests verts ne le voyaient pas).
2. **Corpus check** (vraies specs APIs.guru) → bug `\r` dans descriptions + OOM DocuSign.
3. **Spike ORIENT** → worker_threads impraticable (avant de coder).
4. **Smoke build prod (T6)** → le build prod ne démarre pas.

→ Renforce la règle déjà promue dans `03-testing.md` (relai → E2E réel). Généralisation : **avant tout claim « prêt pour la prod », valider contre des entrées réelles, le vrai chemin de build, et un vrai client** — les tests unitaires verts ne suffisent jamais à le garantir.

## Findings EVALUATE et traitement
- Security-review : 0 bloquant. 2 durcissements **appliqués** (env enfant allowlisté, cap stdout). Dépendance rate-limit amont + dimensionnement RAM **tracés**.
- Simplify : `MAX_SPEC_BYTES` partagé + `KNOWN_CODES` supprimé **appliqués** ; unification du contrat d'erreur (`PARSE_TIMEOUT` vs `TIMEOUT`) **tracée** (BACKLOG).

## Reference
SPEC `.workflow/SPEC-PARSER-OOM.md`, SPIKE-LOG, D004, BACKLOG § robustesse prod.
