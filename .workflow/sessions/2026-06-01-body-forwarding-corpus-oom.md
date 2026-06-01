# Session 2026-06-01 — Body forwarding, corpus check, OOM parser (cadrage)

Longue session. Trois blocs : (1) clôture Pivot-4 + LEARN, (2) feature body forwarding de bout en bout, (3) durcissement prod (corpus check + cadrage OOM).

## 1. Clôture Pivot-4
- DELIVER Pivot-4 (PR #20) déjà fait début de session : front SLICE Cloud, EVALUATE CRITIQUE (SSRF trouvée+corrigée), UAT.
- **Validé en live dans Claude Desktop** : `slice-notion` (via supergateway) → `list_all_users` → vrais users du workspace Notion. Modèle « URL + token relayé » prouvé en conditions réelles.
- LEARN Pivot-4 (PR #21) : REVIEW + règle « relai → test E2E contre vrai upstream » promue dans `03-testing.md`.

## 2. Body forwarding (PR #23, mergé)
Cycle FORGE complet SPEC → REFINE → GENERATE → EVALUATE → DELIVER.
- **Décision (Option B, choisie par l'utilisateur)** : chaque champ du `requestBody` devient un param `in:'body'` à plat (forme idiomatique MCP, comme le vrai MCP Notion), pas un objet `body` unique. Modèle unifié : `EndpointParam.in += 'body'` + `schema` + `wireName`.
- 8 tâches TDD strict. 2 passes /advisor (SPEC + PLAN) ont corrigé des trous AVANT le code (passthrough obligatoire sinon les clés libres sont strippées ; `toZodShape` ; `wireName` pour les collisions ; capture du body dans les mocks de test).
- **Bug trouvé en UAT live** (pas par 444 tests unitaires) : les champs de body devenaient tous *obligatoires* car `schemaShapeForParam` renvoyait `schema` sans le flag `required`. Corrigé. Leçon : les tests unitaires utilisaient des params fabriqués à la main ne reflétant pas la sortie réelle du parser → tester à travers le pipeline complet.
- **Recherche Notion (`POST /v1/search`) validée en live** — ce qui était impossible (« lister/chercher des pages » = endpoint Search avec body) marche maintenant.

## 3. Durcissement prod
### Corpus check (lever B) — `scripts/corpus-check.ts`
- Passe N vraies specs d'APIs.guru dans parse → generate, vérifie que chaque Zod généré se construit. Classe ok / rejet gracieux / bug.
- **Run 500 API : 412 ok, 83 rejets gracieux (62 OAuth, 15 invalides, 6 vides), 5 too-big, 0 bug de correction.**
- **2 bugs réels trouvés** (invisibles sur Notion) : un `\r` (CRLF) dans des descriptions cassait le code généré (agco-ats, wheretocredit) → corrigé via `JSON.stringify` (échappe tout). Universellement utile.
- **Finding PROD-CRITIQUE** : DocuSign (3,13 MB, **sous** la limite 10 MB) fait OOM (>2 GB) au déref `$ref` → **crashe le serveur** (DoS trivial). Baisser la limite de taille = faux fix (la mémoire n'est pas proportionnelle à la taille).

### Question stratégique de l'utilisateur : « comment être exhaustif avant la prod ? »
Réponse cadrée en 3 leviers : **A** matrice de features OpenAPI (finie, auditable), **B** corpus de vraies specs (fait), **C** rapport fail-loud (jamais de mauvais output silencieux). Tous tracés au BACKLOG.

### Cadrage OOM parser (branche `feature/parser-oom-isolation`)
- SPEC `.workflow/SPEC-PARSER-OOM.md` rédigée + critiquée /advisor.
- **Approche validée** : isoler `parseSpec` dans un worker_threads avec cap mémoire (`resourceLimits`) + wall-clock timeout → erreur typée `PARSE_TOO_COMPLEX`, serveur survit.
- **L'advisor exige un spike ORIENT (~2h) AVANT de coder** : 3 hypothèses non vérifiées (le cap attrape-t-il l'OOM proprement ; fixture `$ref` bomb = fan-out exponentiel non-cyclique, pas une chaîne cyclique ; worker résoluble en dev/prod/Vitest).
- **Trou de design ajouté** : R-O7 cap de concurrence (sinon N uploads × cap = DoS multi-requête rouvert).
- **PAS implémenté** — déféré (chantier infra, seulement bloquant pour la prod à l'échelle).

## État du repo en fin de session
- `main` : Pivots 1-4 + body forwarding mergés. 446 tests verts, typecheck clean.
- Branche `feature/parser-oom-isolation` : SPEC OOM + ce résumé + CLAUDE.md à jour (pushée, à reprendre).
- Serveur `pnpm dev` : probablement encore allumé (à couper).

## Reprise prochaine session
1. `git checkout feature/parser-oom-isolation` (porte le plan OOM + le pointeur CLAUDE.md à jour).
2. **Lancer le spike ORIENT** (`.claude/rules/phases/04-orient.md`) sur les 4 hypothèses de la section « Corrections /advisor » de `SPEC-PARSER-OOM.md`.
3. Selon résultat du spike : patcher la SPEC → REFINE → GENERATE → EVALUATE CRITIQUE (DoS) → DELIVER.
4. Ensuite, par impact : **OAuth amont** (plus gros levier de couverture), puis leviers A/C.

## Notes
- Jeton Notion de test exposé dans le chat + dans la config Claude Desktop (`slice-notion`) → à révoquer côté utilisateur.
- L'utilisateur a explicitement préféré l'Option B (étaler les champs) après que je lui aie expliqué le fonctionnement standard d'un MCP — bon réflexe pédagogique à reproduire.
