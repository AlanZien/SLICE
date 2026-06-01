# Plan : Isolation mémoire du parsing (anti-OOM / anti-DoS)

Date : 2026-06-01
SPEC : `.workflow/SPEC-PARSER-OOM.md` (patchée post-spike) · Décision : D004 · Spike : SPIKE-LOG
Niveau : Complexe + **CRITIQUE** (DoS)
Statut : EN ATTENTE DE VALIDATION (REFINE)

## Objectif

`parseSpec` ne tourne plus dans le process serveur : il est isolé dans un **child_process** jetable, borné par un **timeout parent (garde primaire, kill)** + un **cap mémoire (filet)**. Une spec pathologique → erreur typée, **le serveur survit**. Un **sémaphore** borne la concurrence pour ne pas rouvrir le DoS multi-requête.

## Couverture SPEC → tâches (chaque règle : nominal + négatif)

| Règle | Tâche | Test |
|-------|-------|------|
| R-O1 survie (OOM/path. → typé, parent vit) | T3 | bomb + timeout court → erreur typée ; **parse normal juste après réussit** |
| R-O2 équivalence | T3 | spec normale via isolé === `parseSpec` in-process |
| R-O3 fidélité erreurs (code préservé) | T2,T3 | malformé → `UNSUPPORTED_FORMAT` ; spec OAuth → `UNSUPPORTED_AUTH` traversent |
| R-O4 timeout = garde primaire (kill) | T3 | spec qui pend + `timeoutMs` court → `PARSE_TIMEOUT`, enfant tué |
| R-O5 intégration | T5 | tests upload/generate/host existants restent verts |
| R-O6 code exposé → HTTP | T1 | `PARSE_TOO_COMPLEX` → 4xx + message humain (route) |
| R-O7 concurrence bornée | T4 | N appels concurrents → ≤ `MAX_CONCURRENT` en vol ; au-delà file/`429` |
| B1 multi-événements terminaison | T3 | `close(code,signal)` sans stdout → `PARSE_TOO_COMPLEX` |
| C1 contrat sérialisation | T2,T3 | enfant émet `{ok,code,message}` ; parent re-throw `ParseError` |

## Fichiers impactés

- [ ] `src/shared/types.ts` — `ParseErrorCode` += `'PARSE_TOO_COMPLEX'`.
- [ ] `src/server/services/parse-child.ts` (nouveau) — entrée enfant : stdin → `parseSpec(timeoutMs:Infinity)` → stdout `{ok,code,message}`.
- [ ] `src/server/services/parse-isolated.ts` (nouveau) — `parseSpecIsolated(raw, { sizeBytes, maxMemoryMb?, timeoutMs? })` : spawn enfant (résolution dev `node --import tsx parse-child.ts` / prod `node parse-child.js`), timeout parent qui `child.kill()` (primaire), cap `--max-old-space-size` (filet), classifie l'issue → `ParsedSpec | ParseError`. Sémaphore de concurrence.
- [ ] `src/server/routes/upload.ts` — `parseSpec` → `parseSpecIsolated` ; map `PARSE_TOO_COMPLEX` → HTTP 4xx + message.
- [ ] `src/server/services/reparse-and-select.ts` — `parseSpec` → `parseSpecIsolated` (couvre generate + host).
- [ ] `src/server/services/_fixtures/ref-bomb.ts` (nouveau, partagé tests) — générateur de `$ref` bomb fan-out non-cyclique (du spike).
- [ ] `package.json` / `tsconfig.server.json` — s'assurer que `parse-child` est émis en prod (`build:server`) et résoluble.

## Tâches (ordre TDD)

- [ ] **T1 — Code d'erreur + mapping HTTP** : `ParseErrorCode += 'PARSE_TOO_COMPLEX'` ; mapper dans les routes (statut 4xx — la spec est en cause — + message « Spec trop complexe : trop de références imbriquées »).
  - RED : route upload reçoit une `ParseError('PARSE_TOO_COMPLEX')` → répond 4xx + message.
- [ ] **T2 — Enfant `parse-child.ts` + contrat d'erreur (C1/R-O3)** : lit stdin, `parseSpec(raw, {sizeBytes, timeoutMs:Infinity})`, écrit `{ ok:true, parsed }` ou `{ ok:false, code, message }`. (Testé indirectement via T3 ; pas d'I/O process dans un unit pur — couvert par l'E2E T3.)
- [ ] **T3 — `parseSpecIsolated` (cœur)** : spawn enfant + stdin/stdout + **timeout parent (kill, primaire)** + cap mémoire (filet) ; classifie : stdout `{ok:true}` → `ParsedSpec` ; `{ok:false,code}` → re-`throw new ParseError(code,message)` ; `close` sans stdout / signal → `PARSE_TOO_COMPLEX`. `opts.maxMemoryMb`/`opts.timeoutMs` pour les tests.
  - RED (intégration, marqué « coûteux ») : (a) spec normale → même `ParsedSpec` que `parseSpec` (R-O2) ; (b) malformé → `UNSUPPORTED_FORMAT` préservé (R-O3) ; (c) **`$ref` bomb + `timeoutMs:1500` → rejette typé (`PARSE_TIMEOUT`/`PARSE_TOO_COMPLEX`) en <3s ET un parse normal juste après réussit** (R-O1/R-O4/B1) ; (d) résolution dev (`tsx`) OK.
- [ ] **T4 — Sémaphore de concurrence (R-O7)** : `MAX_CONCURRENT_PARSES` (env-overridable, défaut 3) ; au-delà, file d'attente ; file trop longue → `ParseError('PARSE_TOO_COMPLEX'?` ou nouveau `PARSE_BUSY`/`429`). **Décider en T4 : réutiliser un code existant ou ajouter `PARSE_BUSY`.**
  - RED : 6 appels concurrents avec cap=2 → jamais plus de 2 enfants en vol simultanément (compteur observé).
- [ ] **T5 — Intégration** : `upload.ts` + `reparse-and-select.ts` basculent sur `parseSpecIsolated`. Comportement inchangé pour les specs valides.
  - RED : les tests existants `upload.test.ts` / `generate.test.ts` / `host*.test.ts` restent verts (non-régression) — ajuster s'ils mockaient `parseSpec`.

## Build / dev-prod
`parse-child` doit être lançable : **dev** `node --import tsx <…>/parse-child.ts` ; **prod** `node <…>/parse-child.js` (émis par `tsc`). `parseSpecIsolated` détecte le mode (ex. extension du module courant / `NODE_ENV`) et compose la commande. Vérifier que `build:server` émet bien `parse-child.js`.

## Tests E2E / coûteux (tracés, cf. 03-testing.md)
T3 est un test d'intégration (spawn process + OOM/timeout réel). Marqué « coûteux » dans UAT.md. Utiliser `timeoutMs` court + cap bas pour rester rapide et déterministe (la garde primaire est le timeout, pas l'attente de l'OOM lent).

## HORS SCOPE (V2)
Pool de workers persistant (réutilisation d'enfants) ; cap mémoire externe (Buffers/ArrayBuffers) — documenté en limite ; limite mémoire réglable par l'utilisateur.

## UAT (DELIVER)
- Uploader une spec « bombe » (ou DocuSign) → l'UI affiche « spec trop complexe », **le serveur reste debout** (les autres requêtes passent).

## Corrections /advisor (à intégrer en GENERATE — bloquantes)

**B-1 — Résolution + smoke prod du child.** Chemin prod réel = `dist/server/server/services/parse-child.js` (double `server`, cf. `start`/`copy:templates`). Résoudre par **extension du module courant**, PAS `NODE_ENV` : `new URL(import.meta.url.endsWith('.ts') ? './parse-child.ts' : './parse-child.js', import.meta.url)`. Commande : dev `node --import tsx parse-child.ts`, prod `node parse-child.js`. **Ajouter T6 (DoD)** : `pnpm build:server` puis smoke spawn du `.js` compilé sur une spec triviale → `{ok:true}` (tracé UAT).

**B-2 — Ne pas aplatir `PARSE_TOO_COMPLEX`.** `reparse-and-select.ts` re-throw aujourd'hui **toute** `ParseError` en `ApiError('INVALID_SPEC',400)` → sur `/generate` et `/host`, le code « trop complexe » est perdu. En T1 : préserver `PARSE_TOO_COMPLEX` (et `PARSE_TIMEOUT`) à travers `reparse-and-select` + le mapping route. Test négatif : POST `/api/host` spec bombe → 4xx « trop complexe », pas « Failed to re-parse ».

**B-3 — Smoke Vitest en tête de T3.** Le spike tournait sous tsx CLI, pas Vitest. Premier sous-test de T3 : spawn `node --import tsx parse-child.ts` **depuis Vitest** avec une spec triviale → `{ok:true}`. Fixer `spawn(…, { cwd: <racine projet> })` (pour résoudre `tsx`). Déclarer `{ timeout: 8000 }` sur les cas coûteux (défaut Vitest = 5s).

## Corrections /advisor (importantes)

- **I-1 — Sortir l'OOM-pur de la CI (anti-flakiness).** Séparer : **T3-c1 (CI, déterministe)** = bombe + `timeoutMs:1500` → le kill tire toujours en 1er → assert **strictement `PARSE_TIMEOUT`** + parent survit. **T3-c2 (PAS en CI)** = OOM réel via SIGABRT → tracé UAT (DocuSign/bombe sans timeout) + **un unit test du classifieur** : `classify(close, null, 'SIGABRT', noStdout)` → `PARSE_TOO_COMPLEX` (couvre B1 sans OOM de 132 s).
- **I-2 — Garde 10 MB AVANT le spawn.** `parseSpecIsolated` throw `PAYLOAD_TOO_LARGE` si `sizeBytes > MAX_BYTES` **sans spawner** (anti spawn-spam). Test : 11 MB → pas de spawn (espionner).
- **I-3 — Contrat I/O figé.** Parent écrit `raw` brut sur stdin puis `end()` ; enfant lit jusqu'à EOF, calcule `Buffer.byteLength` lui-même, émet **une** ligne JSON `{ok,…}` puis exit 0 ; parent **accumule** stdout, parse au `close`. R-O2 testé sur fixture riche (cf. A-2) couvre le backpressure.
- **I-4 — Env enfant nettoyé.** `spawn(…, { env: { ...process.env, NODE_OPTIONS: '' } })` — cap mémoire **uniquement** en argv (évite double `--max-old-space-size` / `--inspect` hérité de Coolify).
- **I-5 — Kill garanti.** Cycle de vie de l'enfant dans un `try/finally` qui `child.kill('SIGKILL')` si encore vivant (timeout, erreur, succès). Idéal : `AbortSignal` (client disconnect, `req.on('close')`). Test R-O4 : assert `child.killed === true`.

## Corrections /advisor (à considérer)

- **A-1 — Sémaphore singleton + file bornée.** `MAX_CONCURRENT_PARSES` (défaut 3) en **singleton module-level** dans `parse-isolated.ts` (partagé upload + reparse, sinon 2× la concurrence). File bornée (`MAX_QUEUE`) ; pleine → **`PARSE_BUSY` neuf → HTTP 429** (état serveur, **PAS** un `ParseErrorCode`). Test : cap=2, 6 appels → max 2 en vol ; file pleine → 429.
- **A-2 — R-O2 sur fixture riche.** `deepEqual(isolated, inProcess)` sur une spec avec path+query+header params, `requestBody` objet imbriqué, `securityScheme` bearer (attrape les pertes de sérialisation silencieuses). Réutiliser une fixture existante du repo.
- **A-3 — Valider le `code` reconstruit.** Parent vérifie `code ∈ ParseErrorCode` (set runtime) avant `new ParseError` ; inconnu/absent → 500 générique. Tester un code ≠ `UNSUPPORTED_FORMAT` (ex. spec OAuth → `UNSUPPORTED_AUTH`) round-trip préservé.
- **A-5 — `PARSE_TOO_COMPLEX` → 422** dans `STATUS_BY_CODE` (la map exhaustive de `upload.ts` forcera l'ajout au typecheck — effet attendu en T1). `PARSE_BUSY` reste **hors** `ParseErrorCode`.

## Definition of Done
- [ ] T1–T6 cochées, tests verts (dont T3-c1 timeout déterministe + classifieur B1).
- [ ] `pnpm typecheck` clean, suite verte ; **`build:server` émet `dist/server/server/services/parse-child.js` + smoke spawn prod OK** (B-1).
- [ ] `PARSE_TOO_COMPLEX` préservé sur upload **ET** generate/host (B-2).
- [ ] Sémaphore singleton partagé + file bornée + 429 (A-1).
- [ ] Note déploiement : `MAX_CONCURRENT_PARSES × maxMemoryMb < RAM instance Coolify` (SPEC C2).
- [ ] EVALUATE **CRITIQUE** (chemin sécurité/DoS) : `/security-review` + `/simplify`.
- [ ] PR sur `feature/parser-oom-isolation`, UAT.md + RETRO mis à jour.
