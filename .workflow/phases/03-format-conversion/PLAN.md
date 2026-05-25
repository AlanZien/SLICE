# Plan : Phase 03 — Conversion automatique Swagger 2.0 & Postman v2

Date : 2026-05-25
SPEC : .workflow/SPEC.md (R1.1.3)
Statut : DRAFT

## Objectif

Ajouter la détection et la conversion automatique silencieuse de deux formats sources additionnels vers OpenAPI 3.0, branchés en amont du parser de la phase 02.

## Fichiers impactes

- [ ] `src/server/services/format-detector.ts` — détecte le format (openapi3, swagger2, postman, unknown) à partir du contenu brut
- [ ] `src/server/services/format-converter.ts` — wrapper unifié `convertToOpenAPI3(raw) → string`
- [ ] `src/server/services/parser.ts` — modifié : appelle `format-converter` avant le parsing principal
- [ ] `src/server/routes/upload.ts` — gère les nouveaux codes d'erreur (`SWAGGER2_CONVERSION_FAILED`, `POSTMAN_CONVERSION_FAILED`, `UNSUPPORTED_FORMAT`)
- [ ] `fixtures/petstore-swagger2.json` — fixture Swagger 2.0
- [ ] `fixtures/shopify-postman-v2.json` — fixture Postman Collection v2
- [ ] `fixtures/graphql-sdl.txt` — fixture format non supporté (pour test refus)

## Taches

- [ ] 1. Installer deps : `swagger2openapi`, `postman-to-openapi`
- [ ] 2. Implémenter `format-detector.ts` :
  - Parse le contenu (JSON ou YAML) sans validation profonde
  - `swagger: "2.0"` à la racine → `swagger2`
  - `info.schema` matchant `https://schema.getpostman.com/json/collection/v2.*` → `postman`
  - `openapi: "3.x"` → `openapi3`
  - Sinon → `unknown`
- [ ] 3. Implémenter `format-converter.ts` :
  - Si openapi3 → passthrough
  - Si swagger2 → `swagger2openapi.convertObj()` avec options safe (pas de fetch HTTP externe)
  - Si postman → `postmanToOpenApi(json)` avec options par défaut, normalisation du résultat
  - Si unknown → throw `UNSUPPORTED_FORMAT`
  - Budget : chaque conversion < 1s p95 sur fixture 50 endpoints
- [ ] 4. Modifier `parser.ts` pour appeler `format-converter` en premier ; le reste du pipeline ne change pas
- [ ] 5. Mapper les codes d'erreur dans `upload.ts` : `SWAGGER2_CONVERSION_FAILED` → 400 + message dédié, idem Postman, `UNSUPPORTED_FORMAT` → 415 + message listant formats acceptés
- [ ] 6. Créer les 3 fixtures
- [ ] 7. Garder l'erreur `UNSUPPORTED_VERSION` du PLAN 02 (Swagger 1.x ou autres OpenAPI exotiques) comme cas distinct

## Tests TDD

- [ ] `format-detector.detect("openapi: 3.0.0...")` → `openapi3` — `format-detector.test.ts`
- [ ] `format-detector.detect("swagger: 2.0...")` → `swagger2` — idem
- [ ] `format-detector.detect(postmanCollectionJSON)` → `postman` — idem
- [ ] `format-detector.detect(graphqlSDL)` → `unknown` — idem
- [ ] `format-converter.convert()` passthrough OpenAPI 3.x — `format-converter.test.ts`
- [ ] `format-converter.convert()` convertit Swagger 2.0 → OpenAPI 3.0 valide (fixture petstore) — idem
- [ ] `format-converter.convert()` convertit Postman Collection v2 → OpenAPI 3.0 (fixture shopify-postman) — idem
- [ ] `format-converter.convert()` throw `UNSUPPORTED_FORMAT` sur GraphQL SDL — idem
- [ ] `format-converter.convert()` throw `SWAGGER2_CONVERSION_FAILED` sur Swagger 2.0 invalide — idem
- [ ] `parser.parse()` accepte fixture Swagger 2.0 valide (conversion + parse) en < 2s p95 — `parser.test.ts`
- [ ] `parser.parse()` accepte fixture Postman v2 valide en < 2s p95 — idem
- [ ] `POST /api/upload` retourne 200 sur fixture Postman valide, avec ParsedSpec — `upload.test.ts`
- [ ] `POST /api/upload` retourne 415 sur fixture GraphQL SDL — idem
- [ ] `POST /api/upload` retourne 400 + code `POSTMAN_CONVERSION_FAILED` sur Postman corrompu — idem

## UAT

- Upload d'une vraie Postman Collection v2 publique (ex. Stripe API Postman) → transition silencieuse vers écran 2, aucun message de conversion.
- Upload d'un Swagger 2.0 (ex. PetStore Swagger 2.0) → transition silencieuse.
- Upload d'un fichier GraphQL SDL (`.graphql` renommé `.yaml`) → toast "Format non supporté".

## Documentation

- [ ] Compléter `docs/API.md` : préciser les 3 formats acceptés et les codes d'erreur ajoutés
- [ ] Mettre à jour README : "Formats acceptés : OpenAPI 3.x, Swagger 2.0, Postman Collection v2"

## Definition of Done

- [ ] Tests TDD passent
- [ ] 3 fixtures réelles utilisées dans les tests
- [ ] Conversion testée bout-en-bout avec une vraie spec Postman publique
- [ ] /review sans problème critique
- [ ] Commit + PR
