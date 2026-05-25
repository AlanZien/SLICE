# Plan : Phase 02 — Upload & parsing OpenAPI 3.x

Date : 2026-05-25
SPEC : .workflow/SPEC.md (section 1.1, écran 2.2)
Statut : DRAFT

## Objectif

Implémenter le flux complet "upload spec → parsing → écran de sélection prêt", pour OpenAPI 3.x natif uniquement (Swagger 2.0 et Postman traités en phase 03).

## Fichiers impactes

- [ ] `src/server/routes/upload.ts` — POST /api/upload (multipart, swagger-parser)
- [ ] `src/server/services/parser.ts` — wrapper safe autour de `@apidevtools/swagger-parser`
- [ ] `src/server/services/spec-normalizer.ts` — normalisation parsed-spec → format interne (`ParsedSpec`)
- [ ] `src/shared/types.ts` — types `ParsedSpec`, `EndpointGroup`, `Endpoint`, `ParseError`
- [ ] `src/server/index.ts` — register route upload, middlewares (multer)
- [ ] `src/client/screens/upload.tsx` — écran 1 (dropzone + états)
- [ ] `src/client/components/dropzone.tsx` — composant dropzone réutilisable
- [ ] `src/client/lib/api.ts` — wrapper fetch typé pour appels back
- [ ] `src/client/App.tsx` — branche le state "écran courant" + `parsedSpec`
- [ ] `fixtures/shopify-50.yaml` — fixture de référence (R1.1.9, R1.2.5)
- [ ] `fixtures/deep-25.yaml` — fixture profondeur 25 niveaux (R1.1.6)

## Taches

- [ ] 1. Installer deps back : `@apidevtools/swagger-parser`, `multer`, `js-yaml` (parseur safe)
- [ ] 2. Installer dep front : `react-dropzone`
- [ ] 3. Définir types partagés `ParsedSpec` (apiName, apiVersion, baseUrl, authType, authHeader, groups[{tag, endpoints[{id, method, path, label, description, params, tokens}]}], **defaultConfig?**). Le champ `defaultConfig` est prévu dès maintenant (peut rester `undefined` en phase 02), complété en phase 06.
- [ ] 4. Implémenter `parser.ts` : timeout 5s, profondeur max 20, désactivation `$ref` HTTP externes, codes d'erreur dédiés (`PARSE_TIMEOUT`, `PARSE_DEPTH_EXCEEDED`, `INVALID_SPEC`, `EMPTY_SPEC`, `UNSUPPORTED_VERSION`). En phase 02, Swagger 2.0 et Postman v2 → `UNSUPPORTED_VERSION` (rejet temporaire). Ce comportement est **remplacé en phase 03** par la conversion automatique.
- [ ] 5. Implémenter `spec-normalizer.ts` : libellés humains (R1.2.2 priorité summary > desc > généré), groupement par tag (fallback "Autres"), exclusion HEAD/OPTIONS/TRACE, génération `id` stable par endpoint (hash)
- [ ] 6. Route `POST /api/upload` : multer (limite 10 Mo, 1 fichier), validation extension JSON/YAML, parse → normalize → renvoyer `ParsedSpec`. Codes HTTP : 200, 400 (invalid), 413 (too large), 415 (bad format), 504 (timeout)
- [ ] 7. Implémenter `<Dropzone>` (react-dropzone) avec états visuels SPEC 2.2 : Default, Hover, Uploading (progress), Parsing, Error. Bouton "Choisir un fichier", drag&drop, message d'aide
- [ ] 8. Implémenter `screens/upload.tsx` : hero (h1 Fraunces "Curated MCP servers for AI agents"), sous-titre, Dropzone, footer minimal. Sur succès parse → callback `onParsed(parsedSpec)`
- [ ] 9. Câbler `App.tsx` : state `{ screen, parsedSpec }`, navigation depuis upload réussi → écran 2 (placeholder "à venir phase 04")
- [ ] 10. Créer les fixtures `shopify-50.yaml` et `deep-25.yaml`

## Tests TDD

- [ ] `parser.parse()` rejette un fichier > 10 Mo avec `PAYLOAD_TOO_LARGE` — `src/server/services/parser.test.ts`
- [ ] `parser.parse()` rejette un YAML profondeur 25 avec `PARSE_DEPTH_EXCEEDED` (fixture `deep-25.yaml`) — idem
- [ ] `parser.parse()` rejette parsing > 5s avec `PARSE_TIMEOUT` — idem (mock timer)
- [ ] `parser.parse()` rejette spec sans `paths` avec `EMPTY_SPEC` — idem
- [ ] `parser.parse()` rejette Swagger 1.x (vieux format avec `swaggerVersion`) avec `UNSUPPORTED_VERSION` — idem
- [ ] `parser.parse()` rejette Swagger 2.0 avec `UNSUPPORTED_VERSION` **en phase 02 uniquement** (sera remplacé par conversion auto en phase 03) — idem
- [ ] **Test perf R1.1.9** : `parser.parse()` p95 < 2s sur fixture `shopify-50.yaml` — `parser.perf.test.ts`
- [ ] `parser.parse()` ignore les `$ref` externes HTTP sans crash — idem
- [ ] `spec-normalizer.normalize()` génère libellés humains selon R1.2.2 (3 cas : summary, description, généré) — `src/server/services/spec-normalizer.test.ts`
- [ ] `spec-normalizer.normalize()` groupe par tag, fallback "Autres" si absent — idem
- [ ] `spec-normalizer.normalize()` exclut méthodes HEAD/OPTIONS/TRACE — idem
- [ ] `POST /api/upload` retourne 200 + ParsedSpec sur fichier valide — `src/server/routes/upload.test.ts`
- [ ] `POST /api/upload` retourne 413 sur fichier > 10 Mo — idem
- [ ] `POST /api/upload` retourne 415 sur extension `.txt` — idem
- [ ] `POST /api/upload` retourne 400 sur YAML malformé — idem
- [ ] `<Dropzone>` appelle `onDrop` au drag&drop ET au clic + sélection — `src/client/components/dropzone.test.tsx`
- [ ] `<Dropzone>` affiche état Error quand `error` prop défini — idem
- [ ] `screens/upload` envoie le fichier à `/api/upload` et appelle `onParsed` sur succès — `src/client/screens/upload.test.tsx`
- [ ] `screens/upload` affiche message d'erreur si le serveur retourne 4xx — idem

## Tests E2E

- [ ] Drag&drop d'une fixture valide → écran 2 affiché — `e2e/upload.spec.ts` (Vitest browser ou Playwright à choisir en phase)

## UAT

- Drag&drop d'un fichier YAML 800 Ko, 80 endpoints → parsing < 2s, transition vers écran 2.
- Drag&drop d'un `.txt` → toast "Format non supporté".
- Drag&drop d'un fichier 12 Mo → toast "Fichier trop volumineux".
- Drag&drop d'un YAML cassé → toast avec raison du parser.

## Documentation

- [ ] Compléter `docs/API.md` : `POST /api/upload` (request, response, codes)

## Definition of Done

- [ ] Tous tests TDD passent
- [ ] Fixtures `shopify-50.yaml` + `deep-25.yaml` créées et utilisées dans les tests
- [ ] Upload d'une vraie spec OpenAPI 3.x (Shopify ou autre) fonctionne en local
- [ ] /review sans problème critique
- [ ] Commit + PR
