# Plan : Phase 11 — Sécurité backend transverse

Date : 2026-05-25
SPEC : .workflow/SPEC.md (section 1.6 hors R1.6.8 déjà posée en phase 08)
Statut : DRAFT

## Objectif

Durcir le backend Express : headers de sécurité (helmet), CORS contrôlé, rate-limit, logs sans body, error handler global sans stacktrace en prod, garde-fou CI anti-`eval`.

## Fichiers impactes

- [ ] `src/server/index.ts` — chaîne de middlewares sécurité dans le bon ordre
- [ ] `src/server/middlewares/rate-limit.ts` — config rate-limit par route
- [ ] `src/server/middlewares/error-handler.ts` — handler global
- [ ] `src/server/middlewares/logger.ts` — logger structuré sans body
- [ ] `.github/workflows/ci.yml` — pipeline avec étape `grep` anti-`eval`
- [ ] `docs/security.md` — récap des protections en place

## Taches

- [ ] 1. Installer deps : `helmet`, `express-rate-limit`, `morgan`
- [ ] 2. Middleware `helmet()` avec `Strict-Transport-Security` en prod, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`
- [ ] 3. CORS : origine dev `http://localhost:5173`, origine prod via env `FRONTEND_ORIGIN`. Refus strict des autres origines.
- [ ] 4. **Vérifier** que la body limit 15 Mo posée en phase 08 sur `/api/generate` fonctionne (test d'intégration). R1.6.8 implémentée en 08, validée en 11.
- [ ] 5. Rate-limit (R1.6.6) : 30 req/min/IP sur `/api/upload` et `/api/generate`, fenêtre glissante (`express-rate-limit`), message JSON standardisé 429 `{ code: 'RATE_LIMITED', message: '...' }`
- [ ] 6. Logger morgan custom : format `:remote-addr :method :url :status :response-time ms`, sortie stdout JSON-line. **Jamais** le body, jamais les headers d'auth.
- [ ] 7. Error handler global :
  - En dev : stacktrace renvoyée
  - En prod : `{ code: 'INTERNAL_ERROR' }` uniquement, stacktrace seulement dans les logs serveur
  - Logge le code, IP, endpoint, durée — **jamais** le body
- [ ] 8. **R1.6.7 — Grep anti-eval CI** : ajouter étape dans `.github/workflows/ci.yml` :
  ```
  - run: |
      if grep -rn -E 'eval\(|new Function\(|vm\.runInContext|require\(.*\$' src/server/; then
        echo "Forbidden dynamic execution found"; exit 1
      fi
  ```

## Tests TDD

- [ ] `helmet` ajoute `X-Frame-Options: DENY` — `src/server/index.test.ts`
- [ ] `helmet` ajoute `X-Content-Type-Options: nosniff` — idem
- [ ] CORS accepte `http://localhost:5173` — idem
- [ ] CORS rejette `http://evil.example.com` — idem
- [ ] Rate-limit retourne 429 au 31e appel `/api/upload` en 1 min depuis la même IP — `rate-limit.test.ts`
- [ ] Rate-limit retourne 429 au 31e appel `/api/generate` — idem
- [ ] Logger n'inclut pas le body multipart de `/api/upload` (regex sur stdout capture) — `logger.test.ts`
- [ ] Logger n'inclut pas le body JSON de `/api/generate` — idem
- [ ] Error handler ne renvoie pas de stacktrace en `NODE_ENV=production` — `error-handler.test.ts`
- [ ] Error handler logge la stacktrace serveur sans la renvoyer — idem
- [ ] **Test "no persistence post-upload" (R1.1.8)** : après `/api/upload`, aucun fichier nouveau dans `os.tmpdir()` — `upload.security.test.ts`
- [ ] **Test grep anti-eval** : un test shell vitest qui exécute le grep sur src/server et échoue si une occurrence trouvée — `eval-guard.test.ts`

## UAT

- Sniff réseau (devtools) : voir les headers `X-Frame-Options`, etc. sur les réponses.
- Tenter une 31e requête en 1 minute : 429.
- Ajouter volontairement `eval('1')` dans src/server, lancer CI → rouge.
- Inspecter les logs serveur : aucun contenu de spec uploadée visible.

## Documentation

- [ ] `docs/security.md` : récap helmet + CORS + rate-limit + body limits + grep CI + parse safe + stateless + logs sans body
- [ ] README : section "Sécurité & vie privée" avec lien vers docs/security.md

## Definition of Done

- [ ] Tests TDD passent
- [ ] CI passe avec l'étape grep anti-eval
- [ ] /security-review sans problème bloquant
- [ ] docs/security.md publié
- [ ] Commit + PR
