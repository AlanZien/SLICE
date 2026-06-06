# Retrospectives

## 2026-05-25 — Phase 01 (Squelette) ✓ mergée

Synthèse courte (détail dans `.workflow/phases/01-skeleton/REVIEW.md`) :
- TDD propre, 4 cycles, 20/20 verts au premier coup.
- EVALUATE STANDARD : 0 Bloquant, 3 Important corrigés en < 10 min, 6 À considérer reportés.
- Surprise : repo déjà bootstrappé hors phase BOOTSTRAP — décalage avec CLAUDE.md "Phase en cours". Pas de pattern récurrent à promouvoir (1 occurrence).
- Patterns à observer en phases 02–04 : PLAN ↔ code drift, concat de classes verbeux, config Express globale.

## 2026-05-31 — LEARN groupé Pivot 1-3 ✓ mergées (PR #16, #17, #18)

Rétro des 3 premières phases du pivot « SLICE Cloud + self-host ». Détail par phase : `REVIEW.md` dans chaque dossier `.workflow/phases/pivot-N-*/`.

- **Pivot-1** (écran « Où héberger ? ») : remplacement de la question transport par le choix d'hébergement, sans toucher au générateur. Dette `mode`/`hosting` assumée.
- **Pivot-2** (kit Docker) : bundle self-host déployable en une commande. Réutilisation forte de l'écran de succès existant.
- **Pivot-3** (relai d'auth) : le MCP relaie le token client sans le stocker. De-risk en spike TDD, E2E runtime via `tsx`, 1 finding sécurité (CRLF) trouvé+corrigé en CRITIQUE.

**Pattern récurrent promu en règle** (seuil 3 atteint) : *tests coûteux/d'intégration tracés, jamais omis silencieusement* → `.claude/rules/03-testing.md`. Détecté sur phases 01, 02, 03, 04, Pivot-2 (perf p95 + docker build reportés).

**Patterns à surveiller** (pas encore 3 occurrences distinctes) :
- EVALUATE proportionnel (revue inline pour diff de templates sans logique) : Pivot-2 + Pivot-3. Promouvoir si réapparaît.
- i18n/langue (hardcode `'Autres'` 02, accent-folding 04, FR/EN UI Pivot-1) : hétérogène → versé au BACKLOG plutôt qu'en règle.

**Reporté à Pivot-4** (bloquants hébergement, issus de Pivot-3) : support multi-session du serveur généré + contrôle d'accès relay par URL haute entropie.

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

### Après phase 06 — Écran de configuration (2026-05-28)

- **[Sécurité] Prototype pollution défensif** — `auth-detector.ts:32` itère `Object.values(schemes)` sans guard `hasOwn`. Les objets venant de swagger-parser sont propres (parsed JSON natif), donc pas d'exploit réel, mais ajouter `Object.hasOwn(schemes, key)` ferme définitivement la classe. Reporté V1.1 (pas critique).
- **[Sécurité] Types OpenAPI custom (`mutualTLS`, …) ignorés silencieusement** — `detectAuth` retourne `'none'` quand un type non reconnu est rencontré (déjà filtré phase 03 pour oauth2/openIdConnect/basic/digest, mais le filtre est ouvert sur les types futurs). L'UI tombe en mode éditable → l'utilisateur configure manuellement. Comportement défendable, manque juste un log/toast pour explicitement signaler "type X non supporté, configurez à la main". À traiter quand un cas réel sera observé.
- **[Architecture] Décision read-only auth basée sur le type détecté** — `defaults.upstreamAuth.type !== 'none'`. Si la phase 03 commence un jour à laisser passer des types custom (cf. point précédent), la décision read-only ne s'appliquera plus à eux. Documenter le couplage explicite phase 03 ↔ phase 06 dans `docs/`.
- **[UX] FALLBACK_DEFAULT dans `config.tsx:73`** — produit `mcpServerToken: ''` si une vieille payload sans `defaultConfig` atterrit. Pas atteignable dans le flow normal (parser injecte toujours `defaultConfig`), mais à supprimer une fois la rétro-compat assurée par tous les déploiements (probablement post-MVP).
- **[Process / leçon]** L'arbitrage produit "auth read-only quand détectée" a émergé d'un échange UAT (utilisateur a remarqué "pourquoi est-ce paramétrable ?"). À garder en tête : les questions naïves de l'utilisateur signalent souvent un design implicite qu'on n'a pas justifié. Réflexe : vérifier en early UAT si un champ est mieux verrouillé qu'éditable.

### Après phase 04bis — Refonte écran sélection 3-col (2026-05-28)

- **[Process / leçon]** **La maquette JSX (`*.workflow/visuals/*.jsx`) est la source de vérité visuelle, pas le wireframe ASCII du SPEC.md.** Phase 04 a livré un layout 2-col en suivant le wireframe ASCII alors que la maquette validée décrivait un 3-col Raycast split. Coût : phase 04bis dédiée au refactor. À enchaîner sur écrans 3-4 : **toujours ouvrir et lire la maquette JSX correspondante avant d'implémenter** (`hifi-screen-3.jsx`, `hifi-screen-4.jsx` pour les prochaines phases).
- **[Architecture]** `useSelection` expose maintenant `focused` (état UI distinct de `selected`) + `tagCounts` mémoisé. Le hook reste source unique de vérité pour la sélection — pas de duplication d'état dans `SelectionScreen`. Bon pattern à reproduire si on ajoute des hooks similaires (`useConfig`, `useGeneration` en phase 06+).
- **[Qualité]** 4 composants supprimés en cleanup (`endpoint-group`, `selection-sidebar`, `bulk-actions`, `economy-counter`). Eslint et typecheck ont remonté immédiatement les imports cassés — protection structurelle correcte. À garder en tête : ne pas laisser de composants "exemple" en place s'ils ne sont plus utilisés (deadcode = drift).
- **[Tests]** Le test d'intégration `selection.test.tsx` a dû passer de `getByText` à `getAllByText` quand le preview pane est apparu — un même endpoint apparaît maintenant dans la liste ET dans le pane. Tests UI doivent tenir compte des écrans multi-vues. Pattern à appliquer : préférer `within(container).getByText(...)` quand on veut scoper.
- **[A11y]** `aria-label="Tag: ${name}"` sur les RailItem pour éviter la collision avec le FilterChips "All". Convention à étendre : préfixer les aria-labels par leur contexte UI quand on a plusieurs zones avec des labels similaires.

### Après phase Pivot-1 — Écran « Où héberger ? » (2026-05-31)

- **[Architecture / Altitude]** `mode` (local/remote/both) est désormais **figé à `'remote'`** par le hook et n'est plus piloté par l'UI → constante déguisée en état, deux notions parallèles (`mode` + `hosting`) pour le même concept. Dette **assumée et documentée** (commentaires `Pivot` dans types.ts + PLAN). Résolution propre = migrer générateur/snippets vers `hosting` puis **dériver ou supprimer `mode`** en **Pivot-2**. Ne pas le laisser se figer au-delà.
- **[Qualité]** `transportLabelFor` + import `DeploymentMode` (`config.tsx`) rendus **vestigiaux** (2 branches sur 3 inatteignables car `mode='remote'`). Pré-existants (hors scope d'un /simplify sur ce diff). À nettoyer quand le preview de l'écran 3 (`McpPackageCard`/`ZipStructurePreview`) sera retravaillé pour le mode hébergé (Pivot-2/3).
- **[Tests]** Fixtures serveur `generate.test.ts`/`generate.perf.test.ts` posent `hosting:'self'` + `mode:'local'` — incohérent avec le nouvel invariant (un kit self-host est HTTP). Sans effet (ce sont des tests générateur qui exercent légitimement le mode local), à aligner quand `mode` sera dérivé de `hosting`.
- **[Process / Visuel]** Refonte de l'écran 3 faite en **réutilisant `DestCard`** (fidélité visuelle préservée via le composant issu de `hifi-screen-3.jsx`), mais **sans maquette hi-fi dédiée au pivot**. La maquette existante est pré-pivot. **À produire : une maquette hi-fi des écrans du pivot (surtout l'écran 4 résultat — URL/kit) avant Pivot-3/5**, conformément à la leçon 04bis.
- **[Process / i18n]** Libellés UI livrés en **anglais** (« SLICE Cloud » / « On my server » / « Deploy to SLICE Cloud ») pour rester cohérent avec les écrans existants, alors que la SPEC-CLOUD écrivait des libellés **français**. Divergence FR/EN **pré-existante** (tout le code UI est en anglais, la SPEC en français) à **arbitrer explicitement** avant de multiplier les écrans. **Décision à acter : langue de l'UI produit = EN ou FR ?**
- **[Process / TDD]** Un changement de **contrat partagé** (champ requis `hosting`) ripple sur ~9 fixtures réparties sur 4 fichiers. Le cycle « contrat » (type+schema+hook+fixtures) a dû être traité comme une unité, et la refonte d'écran comme un cycle cohérent (4 assertions RC interdépendantes sur un même render) plutôt que 4 micro-cycles. Pattern à formaliser si récurrent : un changement de schéma partagé = un cycle de propagation atomique, pas un critère métier isolable.

### Après phase Pivot-2 — Kit Docker self-host (2026-05-31)

- **[Cohérence]** Les fichiers Docker (`Dockerfile`, `docker-compose.yml`) et la section README Docker sont **toujours inclus**, même pour un bundle `mode='local'` (stdio sans HTTP). Incohérent en théorie (Docker lancerait un serveur sans transport HTTP exposé), mais **inatteignable via l'UI** depuis Pivot-1 (`mode` figé à `remote`). Acceptable. Si un jour le générateur ré-expose le mode local, gater la section Docker sur `modeHttpOnly`.
- **[Tests]** E2E `docker build` réel (RC3.6) **non automatisé** (dépendance Docker en CI) → reporté en UAT manuel. À automatiser via un job CI dédié avec Docker-in-Docker si la régression du Dockerfile devient un risque.
- **[Process / EVALUATE]** Revue /simplify faite **manuellement** (proportionnalité : diff de 3 templates statiques + 2 edits, zéro logique). Pas de fan-out 4 agents. Pattern : réserver le fan-out aux diffs avec logique/branches, faire une revue inline pour les ajouts de templates/config.
- **[Dépendance]** Dockerfile en `npm` (pas `pnpm` comme le README d'install) pour éviter d'installer pnpm dans l'image Node alpine. Scripts `build`/`start` runner-agnostiques, donc OK — mais divergence à garder en tête si on ajoute un lockfile au bundle.

### Après phase Pivot-3 — Mode relai d'auth (2026-05-31)

- **[Sécurité — CORRIGÉ]** EVALUATE CRITIQUE / security-review : la regex `relayedToken` `/^Bearer\s+(.+)$/i` laissait passer un `\r` interne (le `.` matche `\r`) → injection de header CRLF théorique dans le token relayé vers l'amont. Neutralisé en pratique par undici, mais **durci** en `[\x21-\x7e]+` (ASCII imprimable sans espace) + test de garde. Pattern à retenir : **toute valeur issue d'un header entrant et replacée dans un header sortant doit rejeter les caractères de contrôle**.
- **[Sécurité — DESIGN, à documenter Pivot-4]** En mode `relay`, le MCP **ne fait aucun contrôle d'accès descendant** (pas de `MCP_SERVER_TOKEN`) : l'accès repose **entièrement sur l'URL non-devinable** côté infra. Pas un bug (choix assumé, RC4.4) mais **exigence infra forte** : URL à haute entropie (CSPRNG ≥128 bits), non loggée par le reverse-proxy/analytics, 404 uniforme pour URL inconnue. À implémenter/tester en **Pivot-4** (Coolify).
- **[Architecture — IMPORTANT, à traiter Pivot-4]** Découvert pendant l'E2E : le serveur MCP généré utilise **un seul transport partagé** (`server.connect(transport)` une fois) → il ne gère qu'**une session à la fois** (`"Server already initialized"` au 2ᵉ client). Acceptable self-host mono-agent, **bloquant pour l'hébergement multi-agents** (SLICE Cloud sert plusieurs sessions). À corriger en Pivot-4 : transport par session (map `sessionId → transport`) OU mode stateless. Pré-existant, mais le cloud le rend critique.
- **[Process / Spike]** De-risk ALS (OQ-3) fait en spike TDD in-process avant de toucher les templates → validé en ~1s, plan B écarté sans coût. Spike promu en test de régression permanent (`relay-threading.test.ts`). Bon pattern pour une inconnue traversant une lib tierce.
- **[Tests]** E2E runtime du code généré rendu praticable via **`tsx`** (pas de build `tsc` dans le test) + serveur enfant + upstream mocké. Réutilisable pour les futurs tests de comportement du code généré.

### Après phase Pivot-4 — Runtime MCP hébergé / SLICE Cloud (2026-06-01)

- **[Sécurité — CORRIGÉ]** EVALUATE CRITIQUE / security-review : **SSRF / open-proxy**. `POST /api/host` (anonyme) acceptait n'importe quel `baseUrl` http(s), et `/m/:id` le `fetch`ait côté serveur SLICE en renvoyant le corps au caller → un attaquant pouvait lire `169.254.169.254` (creds IAM cloud), services internes. Corrigé : `ssrf-guard.ts` (rejet loopback/privé/link-local/metadata, IPv4-mapped IPv6 inclus), imposé à la création (`400 BLOCKED_HOST`) **et** au runtime. `allowPrivateHosts` off en prod, on en dev/test. Pattern : **tout fetch serveur vers une URL fournie par l'utilisateur doit être SSRF-gardé (host, pas juste protocole)**.
- **[Architecture — RÉSOLU]** Le mono-session du code généré (signalé Pivot-3) est résolu : runtime `/m/:id` **stateless**, transport par requête (`sessionIdGenerator: undefined`). E2E 2 agents en parallèle relayant chacun son token : vert.
- **[Bug — CORRIGÉ, trouvé en UAT réel]** Les params `in:'header'` (ex. `Notion-Version`, requis par Notion à chaque appel) étaient **parsés et exposés à l'agent mais jetés** par `callUpstream` (qui ne forwardait que path+query). Trouvé en testant pour de vrai contre l'API Notion dans Claude Desktop, pas par les tests unitaires. Corrigé (forward des headers, auth relay prioritaire). **Leçon : l'UAT bout-en-bout contre une vraie API a révélé un trou que 414 tests verts ne voyaient pas.**
- **[Validation]** Bout-en-bout prouvé : **Claude Desktop → supergateway → SLICE `/m/:id` → vraie API Notion** (`list_all_users` renvoie les vrais users du workspace). Le modèle « URL + token relayé » tient en conditions réelles.
- **[Process / EVALUATE]** `/simplify` en fan-out 4 agents (reuse/simplification/efficiency/altitude) sur un diff à logique. Appliqué : dédup `reparseAndSelect` (host+generate), `throwApiError` (client), suppression d'un test demo qui écrivait dans `~/Desktop`. Skippé : simplif `buildZodSchema` (branches array/object **pas** mortes — params tableau les atteignent → risque de changement de comportement).

#### Dette ouverte (→ BACKLOG)
- **Perf hot path** : `/m/:id` reconstruit le `McpServer` + tous les tools + schémas Zod à **chaque requête HTTP** (stateless = par message JSON-RPC). D003 prévoyait un cache LRU par id, non implémenté. Configs immutables → mémoïsable.
- **SSRF DNS-rebinding** : le re-check runtime fait un `dns.lookup` par appel mais ne pinne pas l'IP → ne protège pas réellement du rebinding (le `fetch` re-résout). Durcir via dispatcher undici qui pinne l'IP résolue, ou TTL-cache.
- **Divergence runtime ↔ kit généré** : objectif « le MCP hébergé et le kit téléchargé exposent le même MCP » **déjà rompu** — le runtime forwarde les headers, le template `http-client.ts.hbs` non. Aligner + source unique pour la regex/charset du token (dupliquée `hosted-mcp-factory.ts` ↔ `auth-context.ts.hbs`).
- **Forwarding du body** (`in:'body'`) : absent (le parser ne flatten pas `requestBody`) → tools POST/PATCH et **recherche Notion** sans corps. Prochain chantier produit.
- **`in:'cookie'` dropé silencieusement** dans `callUpstream` (exposé à l'agent puis ignoré).
- **`allowPrivateHosts`** propagé dans 5 signatures avec 3 défauts → en faire une politique d'env unique.
- **Snippet Claude Desktop** : le bloc `url + headers` généré par SLICE ne se colle pas dans Claude Desktop (l'écran connecteur n'a pas de champ header ; il faut `supergateway`/`mcp-remote` via le fichier de config). SLICE devrait générer ce format pour l'onglet Claude.
- **Persistance du store** : `hostedStore` in-memory → l'URL meurt au restart serveur. KV/DB pour la prod.

## 2026-06-01 — fix: réparation du build prod ✓ mergé (PR #26)

Détail : `.workflow/phases/fix-prod-build/REVIEW.md`.

- Le build prod compilé ne démarrait **jamais** (PROD-CRITIQUE tracé au smoke T6). **3 bugs prod distincts déroulés en lançant le binaire** : imports ESM sans `.js` + alias `@shared` non réécrit (`ERR_MODULE_NOT_FOUND`) ; route catch-all `'*'` rejetée par Express 5 ; `clientDist` faux (`../client` → `../../client`). Les 2 derniers vivent dans une branche `if (production)` jamais exécutée en dev/test.
- **4ᵉ bug en cascade attrapé par le nouveau smoke** : `tsc -b` (typecheck) ré-émettait du JS sans `tsc-alias` dans `dist/server`, clobbant le bon artefact. Fix : `noEmit` au typecheck, émission réservée à `tsconfig.server.build.json`.
- **Choix `tsc` + `tsc-alias`** (pas bundler) pour préserver les hypothèses filesystem du runtime isolé (`parse-child.js` sibling, templates en `../templates`).
- **Pattern récurrent — « valider contre la réalité » (5ᵉ confirmation)** : déjà promu en règle (`03-testing.md`) la session précédente. Le smoke `pnpm prod:smoke` (boot du binaire compilé + health + statique + fallback SPA + upload réel via `parse-child.js` compilé) matérialise le levier « vrai chemin de build ». Sous-pattern à surveiller : les branches `NODE_ENV==='production'` sont systématiquement non testées (3/4 bugs y vivaient).
- **Dette → BACKLOG** : câbler `pnpm prod:smoke` en CI pré-release ; figer la version pnpm (`packageManager` + corepack) — store v9 du PATH incompatible avec le `node_modules` v10.

## 2026-06-02 — CI pré-release + pnpm figé ✓ mergé (PR #28)

Détail : `.workflow/phases/ci-pre-release/REVIEW.md`.

- Filet de sécurité automatique posé avant le chantier OAuth : `ci.yml` (gate sur chaque PR/push main — typecheck + test + prod:smoke, déterministe) + `corpus.yml` (`workflow_dispatch` à la demande). pnpm figé (`packageManager: pnpm@9.13.2` + corepack). `corpus-check` rendu CI-utilisable (`exit(1)` sur vrai bug via `hasRealBugs` ; guard `import.meta.url`).
- **Le gate a prouvé sa valeur au premier run** : échec de `mcp-generator.snapshot.test.ts`, un test jamais exécuté en CI qui passait en local mais cassait en environnement propre — `pnpm exec tsc` dans un tmp dir déclenche, via une pnpm récente récupérée par corepack (`verify-deps-before-run`), un install implicite qui écrase les symlinks. Fix : binaire `tsc` du workspace appelé directement.
- **Process** : reformuler les options en langage humain (utilisateur « pas compris ») a débloqué la décision, et la question « ce test est-il essentiel ? » a allégé le scope (corpus en dispatch seul, pas de nightly).
- **Pattern « valider contre la réalité » (Nᵉ confirmation, déjà en règle)** — sous-pattern affiné et promu dans `03-testing.md` : un test qui shell-out vers un package manager n'est pas hermétique ; invoquer le binaire directement.

## 2026-06-02 — Chantier OAuth amont (client_credentials) ✓ mergé (PR #30/#32/#33/#34)

Détail : `.workflow/phases/oauth/REVIEW.md`.

- Support OAuth2 amont en 4 sous-phases (1a acceptation → 1b flow client_credentials self-host → 1c relai hébergé → 1d UI+mesure). Débloque ~1/5 des API réelles (corpus : 0 rejet OAuth, Stripe & co passent).
- **Découpage advisor d'une phase ~12 fichiers en 4 sous-phases** ordonnées par dépendance : chaque PR verte isolée, points d'arrêt nets. À refaire systématiquement pour > 5 fichiers.
- **ORIENT sans spike (D005)** : la stratégie de test de 1b tranchée par analyse du banc relai existant (pattern dérivable + piège mono-session → concurrence testée sur module isolé). Demi-journée économisée.
- **EVALUATE CRITIQUE a trouvé 2 RCE HIGH** invisibles à 487 tests verts : tokenUrl/scopes d'une spec hostile interpolés dans des string-literals du code généré → injection. Corrigé (JSON-encode + rejet Zod + tests). Justifie le classement CRITIQUE sur auth/codegen.
- **Pattern promu** (`01-conventions.md`, 3 occurrences) : toute donnée externe injectée dans du code généré doit être `JSON.stringify`-ée, jamais interpolée brute ni échappée à la main.
- Findings → BACKLOG : infra de test relay/oauth dupliquée ; audit de l'échappement maison de la description des tools (même classe de risque).

---
Alimente par le workflow FORGE (phase LEARN).
Les patterns recurrents sont promus dans .claude/rules/ pour influencer les futures sessions.

## 2026-06-06 — Upload par URL (SSRF-safe) ✓ mergé (PR #38)

Détail : `.workflow/phases/upload-url/REVIEW.md`.

- Écran 1 : deuxième mode d'import (URL HTTPS) en plus du file drop. Fetch SSRF-safe avec guard sur chaque hop de redirect (incluant l'URL initiale), timeout 5s, cap streaming 10 MB.
- **Bug détecté en EVALUATE (invisible aux tests)** : `rawSpec = JSON.stringify(ParsedSpec)` au lieu du texte OpenAPI original. La génération aurait échoué silencieusement pour toute spec chargée par URL. Corrigé : le serveur renvoie `{ parsed, raw }`.
- **Pattern architectural à surveiller** : endpoint de transformation → client a besoin de l'original ET du résultat. À promouvoir si 3e occurrence.
- 507 tests verts. Pas de nouveau pattern promu dans `.claude/rules/`.
