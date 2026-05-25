# Plan : Phase 06 — Écran de configuration

Date : 2026-05-25
SPEC : .workflow/SPEC.md (section 1.3, écran 2.4)
Statut : DRAFT

## Objectif

Implémenter l'écran 3 : formulaire compact avec champs auto-détectés et éditables (nom MCP, URL base, type auth amont), 3 cards radio "Où ton agent va l'utiliser ?", section "Options avancées" repliable, bouton "Générer mon MCP".

## Fichiers impactes

- [ ] `src/client/screens/config.tsx` — écran 3 complet
- [ ] `src/client/components/mode-card.tsx` — card cliquable radio "Sur mon ordi / Serveur en ligne / Les deux"
- [ ] `src/client/components/advanced-options.tsx` — toggle déplier + champs avancés
- [ ] `src/client/components/auth-radio.tsx` — radio group Aucune / Clé API / Bearer
- [ ] `src/server/services/auth-detector.ts` — détecte auth amont depuis `securitySchemes` (R1.3.1)
- [ ] `src/server/services/slug.ts` — slugify titre API → nom MCP avec fallbacks (R1.3.1)
- [ ] `src/server/services/token-generator.ts` — génère un MCP_SERVER_TOKEN aléatoire 32 chars hex
- [ ] `src/shared/types.ts` — type `SliceConfig` (mcpName, baseUrl, upstreamAuth: {type, headerName?}, mode, mcpServerToken?, includeParamDescriptions)
- [ ] `src/server/services/spec-normalizer.ts` — modifié : ajoute `defaultConfig` au ParsedSpec (slug + auth détectés + token généré)
- [ ] `src/client/hooks/use-config.ts` — state form + validation Zod
- [ ] `src/client/App.tsx` — branche écran 3 → callback `onGenerate(config)` (placeholder phase 07)

## Taches

- [ ] 1. Implémenter `slug.ts` : `slugify(title)` (kebab-case, accents retirés), validation `^[a-z0-9-]{3,40}$`, fallback `<slug>-mcp` si < 3 chars, fallback `mcp-server-<hash4>` si vide
- [ ] 2. Implémenter `auth-detector.ts` : parse `securitySchemes` OpenAPI 3, retourne `{type: 'none'|'apiKey'|'bearer', headerName?}`. Fallback 'apiKey' avec message pour types non supportés (oauth2, etc.)
- [ ] 3. Implémenter `token-generator.ts` : `randomBytes(16).toString('hex')` → 32 chars hex
- [ ] 4. Modifier `spec-normalizer.ts` pour produire un `defaultConfig` lors du parse, transmis au front avec le ParsedSpec
- [ ] 5. Définir `SliceConfig` partagé + schéma Zod de validation (côté shared)
- [ ] 6. Implémenter `useConfig(defaultConfig)` : state + validation onBlur, retourne `{ config, errors, isValid, setField }`
- [ ] 7. Implémenter `<AuthRadio>` : 3 radios (Aucune / Clé API / Bearer), input header conditionnel si Clé API choisie
- [ ] 8. Implémenter `<ModeCard>` : card cliquable, état actif avec background ink, badge "Recommandé" sur "Les deux"
- [ ] 9. Implémenter `<AdvancedOptions>` : toggle ⚙️ replié par défaut, contient `mcpServerToken` (visible si mode HTTP), nom du header auth amont éditable, checkbox `includeParamDescriptions`
- [ ] 10. Implémenter `screens/config.tsx` : form layout SPEC 2.4, bouton "Générer" désactivé si !isValid ou mode==null. Bouton "← Retour" qui repasse à écran 2 en gardant la sélection
- [ ] 11. Câbler `App.tsx` : transition écran 2 → 3 (config initialisée avec defaultConfig + selectedIds en state)

## Tests TDD

- [ ] `slugify("Shopify Admin API")` → `"shopify-admin-api"` — `slug.test.ts`
- [ ] `slugify("AI")` → `"ai-mcp"` (fallback < 3 chars) — idem
- [ ] `slugify("!!!")` → `"mcp-server-<hash>"` (fallback vide) — idem
- [ ] `slugify("Foo Bar 123")` valide la regex `^[a-z0-9-]{3,40}$` — idem
- [ ] `auth-detector.detect({}|undefined)` → `{type:'none'}` — `auth-detector.test.ts`
- [ ] `auth-detector.detect({apiKeyAuth: {type:'apiKey', name:'X-API-Key', in:'header'}})` → `{type:'apiKey', headerName:'X-API-Key'}` — idem
- [ ] `auth-detector.detect({bearerAuth: {type:'http', scheme:'bearer'}})` → `{type:'bearer'}` — idem
- [ ] `auth-detector.detect({oauth2Auth: {type:'oauth2'}})` → `{type:'apiKey', fallback:true}` — idem
- [ ] `token-generator.generate()` retourne 32 chars hex uniques — `token-generator.test.ts`
- [ ] `useConfig` valide le nom MCP avec la regex, marque error si invalide — `use-config.test.ts`
- [ ] `useConfig` valide l'URL (https://, ou http:// si advanced) — idem
- [ ] `<AuthRadio>` affiche le champ headerName uniquement si "Clé API" sélectionné — `auth-radio.test.tsx`
- [ ] `<ModeCard active>` applique le style actif (background ink) — `mode-card.test.tsx`
- [ ] `<AdvancedOptions>` masqué par défaut, visible après click sur toggle — `advanced-options.test.tsx`
- [ ] `screens/config` désactive "Générer" si mode==null — `config.test.tsx`
- [ ] `screens/config` désactive "Générer" si nom MCP invalide — idem

## Tests E2E

- [ ] Upload spec → sélection → config : champs préremplis depuis defaultConfig, choisir "Les deux", cliquer "Générer" → callback déclenché avec le SliceConfig complet

## UAT

- Spec Shopify : nom prérempli `shopify-admin-api`, URL prérempli, auth Clé API + header `X-Shopify-Access-Token` détecté.
- Éditer le nom en "Foo Bar!" → erreur "Lettres minuscules, chiffres et tirets uniquement".
- Choisir "Sur mon ordi" → token MCP caché (pas pertinent en stdio).
- Choisir "Les deux" → options avancées contiennent un MCP_SERVER_TOKEN généré.
- Spec sans `info.title` : fallback `mcp-server-<hash>` affiché.

## Definition of Done

- [ ] Tests TDD passent
- [ ] Auto-détection testée avec 3 specs réelles (Shopify, Stripe, GitHub)
- [ ] Validations bloquent correctement le bouton Générer
- [ ] /review sans problème critique
- [ ] Commit + PR
