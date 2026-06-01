# SPEC — Isolation mémoire du parsing (anti-OOM / anti-DoS)

Date : 2026-06-01
Niveau : Complexe + **CRITIQUE** (DoS — une spec peut crasher le serveur)
Origine : corpus check APIs.guru — DocuSign (3,13 MB, **sous** la limite 10 MB) fait OOM (>2 GB) au déréférencement `$ref`, **avant** que le timeout 5s / le check de profondeur ne s'activent.

## Problème

`parseSpec` tourne **dans le process serveur**. swagger-parser, en dépliant les `$ref`, peut faire exploser la mémoire **indépendamment de la taille du fichier** (un fichier de 3 MB → objet de 2 GB). Conséquences :
- **Une seule spec uploadée peut OOM-crasher tout le serveur** (tous les tenants tombent). DoS trivial.
- Les défenses actuelles (limite 10 MB, timeout 5s, `MAX_NODES` sur l'arbre brut) **ne couvrent pas** ce cas : l'explosion est *pendant* le deref, l'arbre brut est petit, et l'OOM est plus rapide que le timeout async.
- **Baisser la limite de taille est un faux fix** : trop strict (bloque de vraies grosses API légitimes) ET trop laxiste (une spec de 1 MB pathologique/malveillante crashe pareil). La taille ne prédit pas la mémoire.

## Objectif

Borner la **ressource réelle** (mémoire + temps) du parsing, quelle que soit la taille/forme de la spec. Une spec pathologique → **erreur gracieuse typée**, **le serveur survit**.

## Approche retenue (à valider)

**Isoler `parseSpec` dans un worker avec plafond mémoire dur + timeout.**
- `worker_threads` avec `resourceLimits.maxOldGenerationSizeMb` (~512 MB). Au dépassement, le worker **se termine seul** (event `error`/`exit`) → le main thread l'attrape et renvoie une `ParseError` typée. Le serveur n'est jamais touché.
- Wall-clock timeout côté parent (ceinture + bretelles) → kill du worker s'il pend.
- I/O worker : `rawSpec` (string) en entrée, `ParsedSpec` (JSON) en sortie ; les `ParseError` typées (`code`) sont reconstruites à la frontière.

**Hors hot path** : seuls `/api/upload`, `/api/generate`, `/api/host` parsent (chemins froids). Le runtime hébergé `/m/:id` **ne re-parse pas** (il sert une config stockée) → aucune régression de latence sur les appels d'agents.

## Risque technique majeur (→ ORIENT / spike avant REFINE)

**Résolution du fichier worker en dev vs prod.** Dev = `tsx watch src/server/index.ts` (le worker doit charger du `.ts`). Prod = `node dist/.../index.js` (le worker charge du `.js` compilé). Les workers **n'héritent pas** automatiquement du loader tsx. Il faut une stratégie qui marche dans les deux (ex. `execArgv: ['--import','tsx']` + `.ts` en dev, `.js` nu en prod, sélection par env). **À dé-risquer par un spike de ≤1h** (un worker minimal qui parse une spec, lancé sous `tsx` ET sous `node` compilé) avant d'investir dans l'implémentation.

## Règles métier (testables)

- **R-O1 (survie — la règle clé)** — Une spec qui ferait OOM en in-process → `parseSpecIsolated` **rejette avec une erreur typée** (`PARSE_TOO_COMPLEX`) **et le process principal reste vivant** (un appel suivant réussit). Fixture de régression : un `$ref` bomb synthétique (petit fichier, expansion combinatoire) — pas besoin de télécharger DocuSign en test.
- **R-O2 (équivalence)** — Une spec normale → `parseSpecIsolated` rend **le même `ParsedSpec`** que `parseSpec` in-process (mêmes endpoints, mêmes params).
- **R-O3 (fidélité des erreurs)** — Les `ParseError` typées de `parseSpec` (`INVALID_SPEC`, `UNSUPPORTED_AUTH`, `PAYLOAD_TOO_LARGE`…) traversent la frontière worker **en conservant leur `code`**.
- **R-O4 (timeout)** — Un worker qui pend au-delà de N s → tué → `ParseError('PARSE_TIMEOUT')`. Le serveur survit.
- **R-O5 (intégration)** — `upload.ts` et `reparse-and-select.ts` (donc generate + host) utilisent la version isolée. Comportement fonctionnel inchangé pour les specs valides (les tests d'upload/generate/host existants restent verts).
- **R-O6 (code d'erreur exposé)** — `PARSE_TOO_COMPLEX` est un nouveau `ParseErrorCode`, mappé à un HTTP 4xx (la spec est en cause, pas le serveur) avec un message humain (« Cette spec est trop complexe à traiter — trop de références imbriquées »).

## Cas d'erreur / limites
- Worker qui crashe pour une raison non-OOM (bug) → erreur générique 500, loggée, serveur survit.
- Coût : ~dizaines de ms par parse (spawn worker). Acceptable (chemins froids). À mesurer, pas de cible dure.
- Pool de workers / réutilisation : **hors scope MVP** (un worker jetable par parse suffit ; optimisation si le throughput le justifie).

## Hors scope
- Heuristique d'estimation d'expansion `$ref` (l'isolation la rend inutile).
- Pool de workers persistant.
- Limite mémoire configurable par l'utilisateur.

## Fixture de test (clé)
Un générateur de `$ref` bomb : un petit doc OpenAPI où un schéma se référence en chaîne (`A→B→C…`) avec fan-out, dont le deref explose. Permet de tester R-O1/R-O4 en CI **sans réseau ni gros fichier**.

## Fichiers pressentis (REFINE)
- `src/shared/types.ts` — `ParseErrorCode` += `'PARSE_TOO_COMPLEX'`.
- `src/server/services/parse-isolated.ts` (nouveau) — `parseSpecIsolated(raw, opts)` : spawn worker, cap mémoire + timeout, mappe erreurs.
- `src/server/services/parse-worker.ts` (nouveau) — entrée worker : importe `parseSpec`, parse, postMessage résultat/erreur.
- `src/server/routes/upload.ts` + `src/server/services/reparse-and-select.ts` — basculent sur `parseSpecIsolated`.
- `src/server/routes/upload.ts` (+ host/generate via le mapping d'erreur) — map `PARSE_TOO_COMPLEX` → HTTP.
- Build : s'assurer que `parse-worker` est émis/copié en prod (`build:server`).

## Corrections /advisor (à intégrer)

**Spike ORIENT non négociable, élargi à ≤2h — 4 hypothèses à vérifier AVANT REFINE :**
1. Résolution du fichier worker dans **3 contextes** : `tsx watch` (dev), `node dist` (prod), **et Vitest** (le worker ne loadera pas le `.ts` sans le pipeline — même problème en test).
2. Fabriquer une **vraie `$ref` bomb** : **fan-out exponentiel non-cyclique** (DAG profond `L0→L1→…`, K props chacune), PAS une chaîne cyclique (swagger-parser détecte les cycles → pas d'explosion). Fichier <50 KB, dérefé `O(K^d)`. + une **garde** prouvant qu'elle OOM bien en in-process (sinon R-O1 teste du vide).
3. Lancer cette bombe dans le worker capé bas (~128 MB) → **observer le mode de terminaison réel** (`error` vs `exit≠0` vs abort V8) et confirmer **parent survit**.
4. Reconstruction d'une `ParseError{code}` via `postMessage`.

**Règles à ajouter/durcir :**
- **B1 (limite à documenter)** : le cap `maxOldGenerationSizeMb` (+ ajouter `maxYoungGenerationSizeMb`) protège contre les OOM **heap V8** (cas DocuSign), **PAS** la mémoire externe (Buffers/ArrayBuffers) → ne jamais sur-promettre « le serveur n'est jamais touché ». Le parent doit gérer `error` **ET** `exit≠0` **ET** `messageerror` → `PARSE_TOO_COMPLEX`.
- **R-O7 (concurrence bornée — MANQUANT, sinon DoS rouvert)** : sémaphore global `MAX_CONCURRENT_PARSES` (2–4). Sinon N uploads concurrents × cap = OOM du process parent. Cap effectif = `MAX_CONCURRENT × maxMemoryMb` à dimensionner < RAM instance. Au-delà : file courte ou `429 PARSE_BUSY`.
- **I2 (un seul timeout autoritaire)** : désactiver le timeout interne coopératif dans le worker (`timeoutMs: Infinity`), laisser **le seul wall-clock parent** (qui peut `worker.terminate()`) gouverner → code `PARSE_TIMEOUT` déterministe.
- **C1 (contrat de sérialisation R-O3)** : le worker ne poste jamais l'instance `Error` (structured clone perd le `code`). Il poste `{ ok: false, code, message }` ; le parent re-`throw new ParseError(code, message)`. Code absent/inconnu → 500 générique.
- **`maxMemoryMb` paramétrable** dans `parseSpecIsolated(raw, { maxMemoryMb?, timeoutMs? })` — indispensable pour tester R-O1 avec un cap bas (OOM rapide, déterministe, pas de dump 512 MB en CI). Test à marquer « coûteux/intégration » (UAT + PLAN).
- **C2** : lier `maxMemoryMb` × `MAX_CONCURRENT` < RAM de l'instance cible (note de déploiement).
