# Retrospectives

## 2026-05-25 — Phase 01 (Squelette) ✓ mergée

Synthèse courte (détail dans `.workflow/phases/01-skeleton/REVIEW.md`) :
- TDD propre, 4 cycles, 20/20 verts au premier coup.
- EVALUATE STANDARD : 0 Bloquant, 3 Important corrigés en < 10 min, 6 À considérer reportés.
- Surprise : repo déjà bootstrappé hors phase BOOTSTRAP — décalage avec CLAUDE.md "Phase en cours". Pas de pattern récurrent à promouvoir (1 occurrence).
- Patterns à observer en phases 02–04 : PLAN ↔ code drift, concat de classes verbeux, config Express globale.

## Findings "à considérer" en attente (alimentés par EVALUATE, traités en LEARN)

### Après phase 01 — Squelette (2026-05-25)

- **[Sécurité]** CORS global ouvert (`cors()` sans config). À restreindre en phase 11 via origines explicites dev/prod. Déjà prévu dans PLAN 11 (T3).
- **[Sécurité]** Body limit `express.json({ limit: '10mb' })` global. À reconfigurer route par route en phase 08 (`/api/generate` à 15 Mo, cf. R1.6.8) et phase 02 (`/api/upload` à 10 Mo via multer).
- **[Sécurité]** Inline script de FOUC prevention dans `index.html` accède à `localStorage`. À transformer en script externe statique (ou hash CSP) quand helmet+CSP arriveront en phase 11.
- **[Qualité]** Patterns de concat de classes via `[].filter(Boolean).join(' ')` dans `stepper.tsx` et `topbar.tsx`. Le helper `cn()` existe déjà dans `src/client/lib/utils.ts`. Uniformiser en passant via `cn()` partout. **À promouvoir en règle si le pattern réapparaît en phase 02–04.**
- **[Cohérence]** Padding topbar `px-5` (20px) vs SPEC §2.1 qui mentionne 18px. Écart de 2px assumé pour rester sur l'échelle Tailwind par défaut. À reconfirmer en phase 12 (audit visuel final).
- **[Tests]** Pas de tests pour le 404, le rate-limit, le static serve en prod. Pas exigé par PLAN 01. À regarder si pattern récurrent de couverture incomplète en phase 02+.

### Après phase 02 — Upload & parsing (2026-05-25)

- **[Sécurité]** `withTimeout` ne cancel pas la `Promise` sous-jacente (Node sans cancel natif). `SwaggerParser.validate` peut continuer en arrière-plan après réponse 504. Acceptable MVP, à regarder en phase 11 si fuite d'event-loop.
- **[Sécurité]** Pas de BOM check sur le buffer avant `toString('utf-8')` dans `upload.ts:54`. Un upload UTF-16/32 produit un `INVALID_SPEC` générique. Rejet OK, à durcir si support multi-encoding requis.
- **[Qualité]** `/* eslint-disable @typescript-eslint/no-explicit-any */` au niveau fichier dans `spec-normalizer.ts:14`. À remplacer par un type `OpenAPIDocument` minimal (info, servers, paths) + casts ponctuels si le pattern réapparaît en phase 04+.
- **[Qualité]** `<Dropzone>` accepte `text/plain` parmi les MIME (workaround navigateur qui sniff mal les .yaml). Vérifier en UAT et resserrer si trop permissif.
- **[Tests]** Pas de test perf R1.1.9 (p95 < 2s sur shopify-50). Fixture créée mais test reporté. À ajouter en phase 04 où le besoin perf devient critique.
- **[Cohérence]** Constante `'Autres'` hardcodée dans `spec-normalizer.ts:47` (conforme SPEC R1.2.3, mais en dur). Stratégie i18n à clarifier avant phase 04.
- **[Sécurité]** `express.json({ limit: '10mb' })` globalement avant `/api/upload`. Un client envoyant `Content-Type: application/json` 10 Mo bufferise en mémoire avant rejet multer (DoS amplifier × 30 req/min). À mounter le json parser route-par-route en phase 11 (avec helmet).
- **[Cohérence]** `normalizeSpec` retourne `authType: 'none'` en dur, ignorant `securitySchemes` du doc validé. Détection de l'auth est traitée en phase 06 (config), mais à confirmer que la phase 06 lit bien le doc original et pas seulement `ParsedSpec`.
- **[UX/Dev]** Dev shortcuts en bas de App.tsx ne resettent plus `apiSlug`/`parsedSpec` au clic sur 1. Préviser comme dev-only ; à retirer en phase 11 (build prod a déjà `import.meta.env.DEV` qui les strip).
- **[Robustesse]** `op.tags?.[0] ?? 'Autres'` ne gère pas le cas `tags: [""]` (groupe au libellé vide). Edge case, à durcir si rencontré dans des specs réelles.

### Après phase 03 — Conversion formats (2026-05-25)

- **[Sécurité]** swagger2openapi recopie `swagger.host` brut dans `servers[0].url` sans filtre. Une spec hostile peut injecter `host: "169.254.169.254"` (AWS metadata). Pas une SSRF côté serveur SLICE (le doc converti ne déclenche pas de requête), mais une **primitive SSRF embarquée dans le code MCP émis en phase 06**. À sanitiser à l'émission code en phase 06 (refus / warning si URL pointe vers RFC1918, link-local, ou metadata endpoints).
- **[Tests]** Pas de tests perf p95 < 1s (conversion) / < 2s (parse Swagger 2) / < 2s (parse Postman) — drift PLAN/code identifié par verifier. Reporté en phase 04 dans le même batch perf que R1.1.9 (parse shopify-50 < 2s).
- **[Qualité]** `isPlausibleOpenApi3` (`format-converter.ts`) vérifie seulement `openapi` + `paths` shape. Ne vérifie pas `info.title/version` requis par OpenAPI 3 schema. Conséquence : un doc converti sans `info` remonte un `INVALID_SPEC` (via SwaggerParser.validate) au lieu de `SWAGGER2_CONVERSION_FAILED`. Message moins clair, pas faux. À étendre si rencontré en UAT.
- **[Cohérence]** `/^3\./` dans `format-detector` accepte `3.99.0` ; le check strict de version reste dans `assertVersion` (`/^3\.[01](\.\d+)?$/`). Cohérent en intention, à confirmer en phase 04 quand on testera avec des specs OpenAPI 3.1 réelles.
- **[Tests]** Garantie `instanceof ParseError` n'est testée que sur un seul cas (`': not anything'`). À étendre si une régression où `throw new Error(...)` se glisse dans le converter.
- **[Sécurité]** `withTimeout` ne cancel pas la conversion (Node sans cancel natif). Sous burst, un Postman de 9 Mo lourd peut consommer ~4.5s CPU avant timeout × 30 req/min/IP = ~150s de blocking CPU par minute par client. Acceptable MVP, à durcir en phase 11 (queue de tâches, ou worker thread avec AbortController).
- **[Sécurité]** `yaml.load` est synchrone et bloque l'event loop. `Promise.race` ne peut pas interrompre du travail sync — un YAML de 10 Mo pathologique tient l'event loop > 5s. Mitigé par MAX_BYTES + CORE_SCHEMA (pas d'expansion d'anchors), à revisiter si un load CPU non négligeable est observé en prod.
- **[Tests]** Test `vi.spyOn(converter, 'convertToOpenAPI3')` dans `parser.test.ts` repose sur ESM live bindings. Vitest+Vite gère bien aujourd'hui, mais une bump majeure pourrait casser. À pinner via `vi.mock('./format-converter', …)` si flake.
- **[Cohérence]** `assertVersion` garde les branches `swaggerVersion` et `swagger=2.0` qui sont devenues dead code (le detector catche avant). Préservées en défense en profondeur si l'ordre detector→parser change. Commentaire de `UNSUPPORTED_VERSION` mis à jour.
- **[UX / Postman]** Limite intrinsèque de `postman-to-openapi` : Postman représente `:id.json` comme un seul segment, qui devient `{id.json}` en OpenAPI au lieu de `{id}.json`. Pas un bug SLICE — c'est l'aller-retour Postman ↔ OpenAPI qui perd l'info. À documenter sur l'écran de sélection (phase 04) si on veut prévenir l'utilisateur : "Les collections Postman avec params suivis d'extensions (`:id.json`) peuvent générer des chemins inattendus." Cas observé en UAT phase 03 sur fixture `shopify-postman-v2.json`.

### Après phase 04 — Écran de sélection (2026-05-26)

- **[Produit / scope]** Tâche 12 du PLAN 04 (qualification light de la spec : refus dur `UNSUPPORTED_AUTH` oauth2/basic, exclusion auto endpoints sans description, exclusion par défaut des `deprecated: true` avec toggle) **non implémentée**. Ajoutée au plan par l'utilisateur entre les sessions et non vue à temps. À traiter avant la PR de phase 06 (config) ou reporter en V1.1 (BACKLOG.md déjà alimenté).
- **[Architecture]** `useSelection` ne re-initialise pas si la prop `spec` change après le premier render (lazy initializer). Avec `handleReset` qui démonte tout, pas de bug actuel — mais le contrat « spec immutable pour la durée de vie du hook » devrait être documenté ou ajouter une dependency sur `spec.apiName` pour re-init.
- **[Architecture]** `<ApiHeader>` permet d'éditer `baseUrl` mais la valeur n'est **jamais propagée** à `App.tsx` ni à `onContinue`. Si l'utilisateur modifie la base URL, le changement est local au composant et perdu au passage écran 3. À câbler en phase 06 (config) ou à expliciter via TODO. **Décision à acter : la base URL éditée doit-elle remplacer `spec.baseUrl` dans le `ParsedSpec` envoyé au générateur ?**
- **[Qualité]** `useKeyboardShortcut(id, cb)` accepte un id qui n'a qu'un seul cas géré (`'cmd+k'`). Abstraction qui ne paie pas son coût aujourd'hui — soit renommer `useCmdK`, soit assumer le switch en phase 06+ quand un autre raccourci arrivera (ex. Esc pour fermer modale).
- **[UX]** Spec à 0 endpoint affichée par `SelectionScreen` produit un layout vide ("0 / 0 endpoints", pas de message). Cas théorique car le parser rejette les specs vides en amont (`EMPTY_SPEC`), mais un fallback explicite "No endpoints in this API" serait plus propre.
- **[Tests]** Test perf `selection.perf.test.ts` mesure le filtre algorithmique en isolation, pas dans un render React. Conforme à R1.2.5 ("filtre côté client") mais ne couvre pas le coût de re-render. À ajouter un test bench dédié si on observe du jank en prod sur grosses specs (Arii API 565 endpoints par exemple).
- **[UX i18n]** `matchesQuery` dans `screens/selection.tsx` ne fait pas d'accent-folding : taper "cafe" ne matche pas "café", "recuperer" ne matche pas "récupérer". Edge case pour specs FR/ES/DE/JP. Fix simple à l'avenir : `s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()`. Reporter en V1.1.
- **[Perf]** `EndpointGroup.selectedCount` recalcule via `.filter().length` à chaque render. Sur Arii (565 endpoints × 94 groupes), un toggle déclenche ~30k ops. Acceptable aujourd'hui mais memoiser via `useMemo` si jank observé.

### Après phase 05 — Compteur tokens (2026-05-26)

- **[Cohérence]** Test de calibration `token-estimator.calibration.test.ts` placé dans `src/server/services/` (à cause des imports `node:fs` + `parseSpec`). Sémantiquement c'est un test de `src/shared/token-estimator.ts`. Acceptable, mais à reconsidérer si on ajoute d'autres tests cross-package — peut-être créer un `tests/integration/` dédié.
- **[Robustesse]** `useSelection` expose désormais `selected: ReadonlySet<string>` (référence stable) en plus de `count`. Migration progressive : `SelectionScreen` l'utilise déjà pour `savedPercent`. Si d'autres consommateurs s'ajoutent, préférer ce point d'entrée stable plutôt que `selectedIds()` qui retourne un fresh array.
- **[Tests]** Les fixtures de calibration ont été générées synthétiquement à partir de templates (lorem-ipsum + structure inspirée de Stripe/GitHub). Réalistes pour les volumes/structure mais pas pour le contenu littéral. Si la formule dévie sur une vraie spec en prod (au-delà des 15%), il faudra refaire la calibration avec un téléchargement live des specs officielles.
- **[Sécurité]** `js-tiktoken` épinglé en exact version (`1.0.21`, plus de `^`) pour éviter qu'un bump mineur ne change le mapping `gpt-4` → encoding et fasse dévier silencieusement le test de calibration. À revisiter explicitement à chaque bump volontaire.
- **[UX]** `EconomyCounter` clampe NaN à 0% défensivement. `computeEconomy` ne produit jamais NaN (garde `total === 0 → 100`), mais le composant est public et doit honorer son contrat.

### Après phase 04bis — Refonte écran sélection 3-col (2026-05-28)

- **[Process / leçon]** **La maquette JSX (`*.workflow/visuals/*.jsx`) est la source de vérité visuelle, pas le wireframe ASCII du SPEC.md.** Phase 04 a livré un layout 2-col en suivant le wireframe ASCII alors que la maquette validée décrivait un 3-col Raycast split. Coût : phase 04bis dédiée au refactor. À enchaîner sur écrans 3-4 : **toujours ouvrir et lire la maquette JSX correspondante avant d'implémenter** (`hifi-screen-3.jsx`, `hifi-screen-4.jsx` pour les prochaines phases).
- **[Architecture]** `useSelection` expose maintenant `focused` (état UI distinct de `selected`) + `tagCounts` mémoisé. Le hook reste source unique de vérité pour la sélection — pas de duplication d'état dans `SelectionScreen`. Bon pattern à reproduire si on ajoute des hooks similaires (`useConfig`, `useGeneration` en phase 06+).
- **[Qualité]** 4 composants supprimés en cleanup (`endpoint-group`, `selection-sidebar`, `bulk-actions`, `economy-counter`). Eslint et typecheck ont remonté immédiatement les imports cassés — protection structurelle correcte. À garder en tête : ne pas laisser de composants "exemple" en place s'ils ne sont plus utilisés (deadcode = drift).
- **[Tests]** Le test d'intégration `selection.test.tsx` a dû passer de `getByText` à `getAllByText` quand le preview pane est apparu — un même endpoint apparaît maintenant dans la liste ET dans le pane. Tests UI doivent tenir compte des écrans multi-vues. Pattern à appliquer : préférer `within(container).getByText(...)` quand on veut scoper.
- **[A11y]** `aria-label="Tag: ${name}"` sur les RailItem pour éviter la collision avec le FilterChips "All". Convention à étendre : préfixer les aria-labels par leur contexte UI quand on a plusieurs zones avec des labels similaires.

---
Alimente par le workflow FORGE (phase LEARN).
Les patterns recurrents sont promus dans .claude/rules/ pour influencer les futures sessions.
