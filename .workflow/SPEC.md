# Specifications : SLICE — MVP

Date : 2026-05-25
Statut : DRAFT
PRD : .workflow/PRD.md
Visuels : .workflow/visuals/slice-design-system/ (design system Claude Design — hi-fi + tokens)

---

## 0. Principe de conception

**SLICE est un traducteur fidèle OpenAPI → MCP.** Il convertit une spec d'API en serveur MCP fonctionnel. Il n'est ni un garde-fou, ni un opinionateur sur le comportement runtime du MCP généré.

**Conséquences directes :**
- Si l'API source expose des actions destructives (DELETE, etc.), SLICE les expose telles quelles. La sélection au moment de la génération (par l'utilisateur) et l'orchestration au moment de l'appel (par l'agent et son hôte : Claude Desktop, Airia, n8n) sont les garde-fous. SLICE n'ajoute pas de warning, pas de confirmation, pas de mode dry-run.
- Si l'API source retourne des erreurs ou de gros volumes, le MCP généré les transmet à l'agent sans reformatage ni limitation. SLICE n'invente pas de pagination, de retry, ou de rate limiting côté MCP runtime.
- Si l'OpenAPI source contient des schémas (paramètres, réponses), SLICE les transcrit fidèlement dans les tools MCP (Zod pour les inputs, types/descriptions pour les outputs). Pas d'invention, pas d'omission volontaire.
- Les libellés humains (R1.2.2) sont la **seule transformation de surface** que SLICE ajoute, et uniquement à des fins UX dans l'écran de sélection. Le code généré reste neutre.

**Ce que SLICE assume seul :** le parsing safe (sécurité serveur), la sélection (UX), la conversion de formats (Swagger 2.0, Postman → OpenAPI), le calcul du compteur d'économie de contexte (affichage marketing), la génération du code MCP.

---

## 0. Vue d'ensemble du parcours

Le flow MVP comporte **4 écrans** (3 étapes utilisateur visibles + 1 écran de succès) :

```
[1] Upload  →  [2] Sélection  →  [3] Configuration  →  [4] Terminé
```

Stepper persistant en topbar : étape courante mise en avant, étapes complétées marquées d'un ✓.

Décisions transverses (tranchées en SPEC) :
- **Génération synchrone** : un seul `POST /api/generate` qui répond avec le ZIP en stream. Pas de jobs ni de polling.
- **ZIP in-memory streaming** : aucune écriture disque, le ZIP est construit en mémoire et streamé dans la réponse HTTP. Stateless 100%.
- **Pas de preview du code** dans l'UI MVP. L'utilisateur télécharge le ZIP et l'ouvre dans son IDE.

---

## 1. Specifications fonctionnelles

### 1.1 Upload & parsing OpenAPI

**Description :** L'utilisateur fournit une spec OpenAPI (JSON ou YAML), SLICE la parse et extrait les endpoints exposables.

**Règles métier :**

- R1.1.1 — Formats acceptés : `.json`, `.yaml`, `.yml`. Tout autre extension/MIME est refusée côté client ET côté serveur.
- R1.1.2 — Taille max upload : **10 Mo strict**. Refus immédiat côté serveur si dépassé (réponse `413 Payload Too Large`).
- R1.1.3 — Formats de spec API supportés :
  - **OpenAPI 3.0.x** et **3.1.x** — natifs.
  - **Swagger 2.0** — conversion automatique vers OpenAPI 3.0 via `swagger2openapi`. Déclencheur : présence de `swagger: "2.0"` à la racine.
  - **Postman Collection v2.x** — conversion automatique vers OpenAPI 3.0 via `postman-to-openapi`. Déclencheur : présence de `info.schema` matchant `https://schema.getpostman.com/json/collection/v2.*`.
  - Toutes les conversions sont **silencieuses** pour l'utilisateur (aucun message, transition directe vers l'écran 2).
  - Budget perf : chaque conversion < **1s** sur fixture de référence (50 endpoints), compté dans R1.1.9 (upload + parsing < 2s p95).
  - Échecs de conversion → erreurs dédiées avec codes internes : `SWAGGER2_CONVERSION_FAILED`, `POSTMAN_CONVERSION_FAILED`. Message utilisateur : "Impossible de convertir ta spec (format : Swagger 2.0 / Postman Collection), vérifie qu'elle est valide".
  - Formats hors-scope MVP (refusés avec message clair) : API Blueprint, RAML, GraphQL SDL, AsyncAPI, gRPC/Protobuf, WSDL, HAR. Message : "Format non supporté. Importe ton API en OpenAPI 3.x, Swagger 2.0 ou Postman Collection v2."
- R1.1.4 — Parsing safe : pas de résolution de `$ref` externes (HTTP), pas d'évaluation de tags YAML arbitraires.
- R1.1.5 — Timeout de parsing : **5 secondes**. Au-delà, abandon avec erreur "Fichier trop complexe à parser" (code interne `PARSE_TIMEOUT`).
- R1.1.6 — Profondeur d'objet limitée à **20 niveaux**. Dépassement → erreur dédiée "Structure trop profonde" (code interne `PARSE_DEPTH_EXCEEDED`), distincte du timeout. Fixture de test : `fixtures/deep-25.yaml` (25 niveaux imbriqués).
- R1.1.7 — Spec valide = au moins **1 endpoint** dans `paths`. Sinon erreur "Aucun endpoint trouvé dans la spec".
- R1.1.8 — La spec n'est **jamais persistée** : elle existe en mémoire le temps du parsing puis est libérée. Pas d'écriture disque.
- R1.1.9 — Performance cible : **upload + parsing < 2s p95** pour une spec de 50 endpoints (~500 Ko), mesuré en local sur machine dev (M1-class ou équivalent). Fixture de référence : `fixtures/shopify-50.yaml`.
- R1.1.10 — Rate limit : **30 requêtes/minute/IP** sur `/api/upload`. Au-delà : `429 Too Many Requests`.

**Cas nominaux :**

- Upload d'un fichier JSON 100 Ko, 25 endpoints, OpenAPI 3.0 → parsé en < 1s, écran 2 affiché.
- Upload d'un fichier YAML 800 Ko, 80 endpoints, OpenAPI 3.1 → parsé en < 2s, écran 2 affiché.
- Drag & drop d'un fichier valide sur la dropzone → même comportement que via le bouton "Choisir un fichier".

**Cas d'erreur :**

- Extension non supportée (.txt, .xml, .pdf) → refus côté client, toast d'erreur "Format non supporté. JSON ou YAML uniquement."
- Taille > 10 Mo → refus immédiat, message "Fichier trop volumineux (max 10 Mo)".
- Contenu non parseable (JSON malformé, YAML cassé) → message "Impossible de lire ton fichier : <raison du parser>".
- Swagger 2.0 ou Postman Collection v2 détecté → conversion automatique transparente, aucun message d'erreur. Si la conversion échoue → message "Impossible de convertir ta spec (format : <Swagger 2.0|Postman Collection>), vérifie qu'elle est valide".
- Format non géré (GraphQL SDL, RAML, AsyncAPI, etc.) détecté à la lecture → refus immédiat avec message "Format non supporté. Importe ton API en OpenAPI 3.x, Swagger 2.0 ou Postman Collection v2."
- Spec sans `paths` ou vide → message "Aucun endpoint trouvé dans la spec."
- Timeout parsing (> 5s) → message "Fichier trop complexe à parser."
- Rate limit dépassé → message "Trop de tentatives. Réessaie dans une minute."

**Cas limites :**

- Spec avec un seul endpoint → accepté, écran 2 affiché.
- Spec avec 500 endpoints → accepté si parsing < 5s. Si dépassement timeout, on tombe sur le cas d'erreur timeout.
- Fichier de 9.9 Mo → accepté.
- Fichier de 10.1 Mo → refusé (R1.1.2).
- Spec avec `$ref` internes uniquement → résolus normalement.
- Spec avec `$ref` externes (`http://...#/...`) → ignorés (le champ apparaît comme non résolu, mais le parsing ne tombe pas en erreur). Le endpoint reste exposable mais on signale `$ref externes non résolus, certains paramètres peuvent manquer` en tooltip sur l'endpoint concerné.
- Connexion coupée pendant l'upload → la requête est avortée côté serveur, aucun état conservé. L'utilisateur reste sur l'écran 1 (Default).
- Plusieurs fichiers déposés simultanément sur la dropzone → seul le premier est pris en compte, les autres ignorés silencieusement.
- Fichier binaire renommé en `.yaml` ou `.json` → le parser échoue à la lecture des premiers octets, cas géré comme "Contenu non parseable" (toast d'erreur générique).
- Spec avec endpoints en double (même méthode + chemin via overrides multiples) → le parser garde la dernière occurrence rencontrée, comportement standard `swagger-parser`.

---

### 1.2 Sélection des endpoints

**Description :** L'utilisateur voit la liste des endpoints détectés, groupés par tag, et coche ceux qu'il veut exposer dans le MCP.

**Règles métier :**

- R1.2.1 — Chaque endpoint affiché contient : checkbox, libellé humain, méthode HTTP (badge), chemin technique en tooltip.
- R1.2.2 — Le **libellé humain** est extrait dans cet ordre de priorité :
  1. `summary` du endpoint OpenAPI (si présent).
  2. Sinon `description` du endpoint (première ligne).
  3. Sinon généré depuis méthode + chemin : `GET /products` → "Lister les products", `POST /products` → "Créer un product", `PUT /products/{id}` → "Modifier un product", `DELETE /products/{id}` → "Supprimer un product".
- R1.2.3 — Les endpoints sont **groupés par tag** OpenAPI. Si pas de tag, groupe par défaut "Autres".
- R1.2.4 — Chaque groupe est un **accordéon repliable**, ouvert par défaut.
- R1.2.5 — Barre de recherche : filtre **côté client**, insensible à la casse, match sur libellé humain ET chemin technique. Performance cible : **p95 < 100ms** sur Chrome desktop M1-class avec fixture `fixtures/aws-500.yaml` (500 endpoints).
- R1.2.6 — Actions bulk disponibles :
  - "Tout cocher les lectures" → coche tous les GET visibles (respecte le filtre).
  - "Tout cocher les écritures" → coche tous les POST/PUT/PATCH/DELETE visibles.
  - "Tout décocher" → décoche tout (visible ou non).
- R1.2.7 — **Sélection par défaut** : tous les GET sont pré-cochés. Tous les POST/PUT/PATCH/DELETE sont décochés. Rationale : un agent veut majoritairement lire, et un endpoint d'écriture coché par erreur est plus dangereux qu'un endpoint de lecture oublié.
- R1.2.8 — **Compteur de contexte économisé** affiché en sidebar droite (sticky), recalculé en temps réel à chaque cochage/décochage. Formule **figée** :
  - Tokens estimés par endpoint = `40 + 8 × (nombre de paramètres) + ⌈(longueur description en chars) / 4⌉`.
  - Tokens MCP = `Σ(tokens endpoints sélectionnés)`.
  - Tokens spec complète = `Σ(tokens tous les endpoints)`.
  - Économie = `round((1 − tokens_MCP / tokens_spec_complète) × 100)` en pourcentage entier.
  - **Calibrage bloquant en GENERATE** : avant tout autre dev sur l'écran 2, mesurer le compte de tokens réel via `tiktoken` (modèle `cl100k_base`) sur **4 fixtures réelles** (Shopify-50, Stripe-200, GitHub-100, et une spec custom courte ~10 endpoints). Ajuster les coefficients de la formule pour atteindre une **tolérance de ±15%** sur les 4 fixtures. Si la formule ne tient pas ±15% après ajustement, escalader avant de continuer (changement de stratégie, ex. : appel `tiktoken` côté serveur au calcul). Le chiffre affiché dans l'UI doit être **fiable, pas marketing**.
- R1.2.9 — Le bouton "Continuer" en sidebar est désactivé si **0 endpoint sélectionné**.
- R1.2.10 — Au moins **1 endpoint sélectionné** est requis pour passer à l'écran 3.

**Cas nominaux :**

- Spec avec 30 endpoints groupés en 5 tags → 5 accordéons affichés, GET pré-cochés, compteur affiche l'économie correspondante.
- Recherche "produit" → seuls les endpoints dont le libellé ou le chemin contient "produit" restent visibles.
- Clic "Tout cocher les écritures" → tous les POST/PUT/PATCH/DELETE visibles passent en coché.

**Cas d'erreur :**

- Tentative de "Continuer" avec 0 endpoint coché → bouton désactivé. Pas de toast (l'état du bouton fait le feedback).

**Cas limites :**

- Spec avec 500 endpoints → liste virtualisée si besoin (à arbitrer en GENERATE selon perf observée). Filtre recherche doit rester < 100ms.
- Spec avec 1 endpoint → un seul accordéon, comportement normal.
- Endpoint sans `summary` ni `description` → libellé généré depuis méthode + chemin (R1.2.2).
- Endpoint avec méthode non-CRUD (HEAD, OPTIONS, TRACE) → exclu du parsing (non pertinent pour un MCP).

---

### 1.3 Configuration finale

**Description :** L'utilisateur valide les champs auto-détectés et répond à la question principale "Où ton agent va l'utiliser ?".

**Règles métier :**

- R1.3.1 — Champs auto-détectés et éditables :
  - **Nom du serveur MCP** : depuis `info.title` (slugifié en kebab-case : "Shopify Admin API" → `shopify-admin-api`). Validation : `^[a-z0-9-]{3,40}$`. **Fallback** : si le slug fait moins de 3 caractères, suffixer avec `-mcp` (ex. titre "AI" → `ai-mcp`). Si le slug est vide ou ne contient que des symboles, valeur `mcp-server-<hash 4 chars du contenu de la spec>`.
  - **URL de base de l'API** : depuis `servers[0].url`. Validation : URL HTTPS valide (HTTP autorisé en option avancée pour le dev local).
  - **Type d'auth amont** : depuis `securitySchemes`. Mapping :
    - `securitySchemes` absent ou vide → "Aucune"
    - `type: apiKey` → "Clé API" (avec préremplissage du nom du header, ex. `X-API-Key`)
    - `type: http, scheme: bearer` → "Bearer token"
    - Autres types (oauth2, openIdConnect, basic) → fallback "Clé API" avec message "Type d'auth non auto-détecté, configure manuellement"
- R1.3.2 — Choix unique obligatoire : "Où ton agent va l'utiliser ?" — 3 cards :
  1. **"Sur mon ordi"** → transport `stdio` seul (Claude Desktop, Cursor, Windsurf, Claude Code)
  2. **"Sur un serveur en ligne"** → transport `HTTP Streamable` seul (n8n, Airia, Zapier)
  3. **"Les deux"** → transports `stdio` + `HTTP Streamable` (recommandé par défaut, badge "Recommandé")
- R1.3.3 — Options avancées (toggle "⚙️ Options avancées" replié par défaut) :
  - **Token de sécurité HTTP** (visible si HTTP ou "Les deux" sélectionné) : champ libre, prérempli avec un token généré aléatoirement (32 caractères hex). Sera la valeur de `MCP_SERVER_TOKEN` dans le `.env.example`.
  - **Nom du header d'auth amont** (visible si "Clé API" sélectionnée) : par défaut `X-API-Key` ou ce qui a été auto-détecté.
  - **Inclure les descriptions détaillées des paramètres** : checkbox, décochée par défaut. Cochée = les descriptions OpenAPI des params sont incluses dans les tool descriptions MCP (plus de contexte mais plus de tokens).
- R1.3.4 — Le bouton "Générer mon MCP" est **désactivé** tant que la question "Où ton agent va l'utiliser ?" n'a pas reçu de réponse.
- R1.3.5 — Validation des champs : si l'utilisateur sort d'un champ avec une valeur invalide (regex nom du MCP, URL malformée), bordure rouge + message d'erreur sous le champ. Le bouton "Générer" est désactivé tant qu'au moins un champ est en erreur.

**Cas nominaux :**

- Spec Shopify avec `info.title: "Shopify Admin API"`, `servers[0].url: "https://shop.myshopify.com/admin/api"`, `securitySchemes: {apiKeyAuth: {type: apiKey, name: X-Shopify-Access-Token, in: header}}` → champs préremplis correctement, type d'auth = "Clé API" + header `X-Shopify-Access-Token`.
- Utilisateur clique "Les deux" puis "Générer" → écran 4 affiché après génération.

**Cas d'erreur :**

- Nom du MCP avec caractères invalides ("My Shopify!") → erreur "Lettres minuscules, chiffres et tirets uniquement (3 à 40 caractères)".
- URL de base malformée ("notaurl") → erreur "URL invalide".
- "Générer" cliqué sans avoir choisi un mode d'utilisation → bouton désactivé, pas d'action.

**Cas limites :**

- Spec sans `servers` → URL préremplie à vide, l'utilisateur doit saisir manuellement.
- Spec avec plusieurs `servers[]` → on prend `servers[0]` et on affiche un select discret si > 1 (option avancée).
- Spec sans `info.title` → nom prérempli `mcp-server-<hash 4 chars>`.
- Auth `oauth2` détectée → fallback "Clé API" + message "Type d'auth non auto-détecté, configure manuellement". OAuth2 reporté V1.5.

---

### 1.4 Génération & téléchargement

**Description :** Au clic sur "Générer mon MCP", SLICE construit le code TypeScript du serveur MCP et le retourne en ZIP.

**Règles métier :**

- R1.4.1 — Endpoint : `POST /api/generate`. Body JSON contenant la spec parsée + la sélection d'endpoints + la config. **Limite body** : 15 Mo max (couvre 10 Mo de spec + sélection + config). Au-delà : `413 Payload Too Large`.
- R1.4.1bis — **Re-validation côté serveur** : le `parsedSpec` reçu est re-parsé via `swagger-parser` avec les mêmes garde-fous que R1.1.4 à R1.1.6 (pas de `$ref` externes, timeout 5s, profondeur 20). Le serveur ne fait **jamais** confiance au client : la spec est re-validée intégralement avant génération. Si invalide → `400 Bad Request` avec code `INVALID_SPEC`.
- R1.4.1ter — Whitelist stricte des `selectedEndpointIds` : chaque id reçu doit correspondre à un endpoint présent dans le re-parsing de la spec. Ids inconnus → ignorés silencieusement. Si 0 id valide après filtrage → `400` avec code `NO_ENDPOINT_SELECTED`.
- R1.4.2 — **Génération synchrone** : la réponse HTTP contient directement le ZIP (`Content-Type: application/zip`, `Content-Disposition: attachment; filename="<nom-mcp>.zip"`).
- R1.4.3 — **In-memory streaming** : le ZIP est construit en mémoire avec `archiver`, streamé dans la réponse. Aucune écriture disque côté serveur.
- R1.4.4 — Performance cible : **génération + download < 5s p95** sur fixture `fixtures/shopify-50.yaml` (50 endpoints). Palier intermédiaire pour 200 endpoints : < 10s. Hard timeout : 30s → `504 Gateway Timeout` avec message d'erreur côté front.
- R1.4.5 — Rate limit : **30 requêtes/minute/IP** sur `/api/generate`.
- R1.4.6 — Pas de stockage post-génération : la spec et la sélection ne sont pas mémorisées côté serveur après l'envoi du ZIP.
- R1.4.7 — Contenu du ZIP (à la racine) :
  - `src/index.ts` — point d'entrée, instancie le serveur MCP et enregistre les transports demandés.
  - `src/tools.ts` — déclaration des tools MCP (un tool par endpoint sélectionné).
  - `src/http-client.ts` — wrapper fetch avec gestion de l'auth amont.
  - `package.json` — dépendances figées : `@modelcontextprotocol/sdk`, `zod`, `dotenv`. Versions à figer en GENERATE.
  - `tsconfig.json` — config TS stricte.
  - `.env.example` — variables nécessaires (API key/bearer amont, `MCP_SERVER_TOKEN` si HTTP).
  - `.gitignore` — `.env`, `node_modules/`, `dist/`.
  - `README.md` — instructions pas-à-pas (installation, démarrage, connexion à Claude Desktop / n8n / Airia avec snippets de config).
- R1.4.8 — Le code généré **fonctionne sans modification**. Test E2E de référence : décompresser le ZIP dans un dossier temp, `npm install`, `npm run build`, lancer `node dist/index.js` avec un `.env` valide. Le serveur MCP doit répondre au handshake `initialize` (en stdio) en **< 3 secondes**, et exposer exactement N tools où N = nombre d'endpoints sélectionnés. Test exécuté en GENERATE avec fixture Shopify-23 (23 endpoints).
- R1.4.9 — Validation des inputs côté MCP généré : chaque tool valide ses arguments avec **Zod**, schémas dérivés des paramètres OpenAPI.

**Cas nominaux :**

- 23 endpoints sélectionnés, mode "Les deux", auth Clé API → ZIP de ~30 Ko téléchargé en < 3s, contient les 8 fichiers attendus, `src/tools.ts` déclare 23 tools.

**Cas d'erreur :**

- Spec corrompue à la génération (cas rare, si l'objet en mémoire a été altéré) → `500 Internal Server Error`, message "Une erreur est survenue, recommence depuis le début".
- Timeout > 30s → `504`, message "La génération a pris trop de temps. Essaie avec moins d'endpoints."
- Rate limit dépassé → `429`, message "Trop de tentatives. Réessaie dans une minute."

**Cas limites :**

- 1 seul endpoint sélectionné → ZIP valide, MCP avec 1 tool.
- 500 endpoints sélectionnés → ZIP plus gros (~200 Ko), génération < 10s acceptée.
- Endpoint avec corps de requête volumineux (JSON Schema complexe) → schéma Zod généré peut être long, mais reste valide.

---

### 1.5 Écran de succès & snippets de connexion

**Description :** Après réception du ZIP, l'écran 4 confirme le succès et fournit les instructions pour connecter le MCP à un agent.

**Règles métier :**

- R1.5.1 — Bouton principal **"Télécharger à nouveau"** : redéclenche le téléchargement (le ZIP est en cache mémoire navigateur depuis la réponse).
- R1.5.2 — 3 étapes affichées :
  1. Télécharger le ZIP (déjà fait).
  2. Configurer le `.env` (lien vers la doc générée dans le README du ZIP).
  3. Connecter à l'agent — snippet de config dans des onglets : **Claude Desktop** | **n8n** | **Airia**.
- R1.5.3 — Snippet **Claude Desktop** : extrait JSON prêt à coller dans `claude_desktop_config.json` (chemin absolu vers le serveur + variables d'env). Bouton "Copier".
- R1.5.4 — Snippet **n8n** : URL HTTP du serveur (placeholder à remplir par l'utilisateur après déploiement) + Bearer token. Bouton "Copier".
- R1.5.5 — Snippet **Airia** : URL HTTP du serveur + Bearer token, format spécifique Airia. Bouton "Copier".
- R1.5.6 — Récap visuel : nom du MCP + nombre d'endpoints exposés + % de contexte économisé. La valeur affichée écran 4 est **strictement égale** à celle affichée écran 2 au moment du clic "Générer mon MCP" (snapshot mémorisé dans l'état applicatif, pas recalculé).
- R1.5.7 — CTA secondaires : "Générer un autre MCP" (retour à l'écran 1) et "Revenir à la sélection" (retour à l'écran 2, garde la spec en mémoire).
- R1.5.8 — Si l'utilisateur a choisi mode "Sur mon ordi" → onglet "Claude Desktop" actif par défaut, onglets n8n/Airia désactivés (grisés).
- R1.5.9 — Si l'utilisateur a choisi mode "Sur un serveur en ligne" → onglet "n8n" actif par défaut, onglet "Claude Desktop" désactivé.
- R1.5.10 — Si l'utilisateur a choisi "Les deux" → tous les onglets actifs, "Claude Desktop" par défaut.

**Cas nominaux :**

- Mode "Les deux", 23 endpoints → écran 4 affiche les 3 onglets, "Claude Desktop" actif, snippet visible, bouton "Copier" copie dans le presse-papier (toast "Copié").

**Cas d'erreur :**

- Pas d'erreur attendue sur cet écran (purement informationnel). Si le clic "Télécharger à nouveau" échoue (cache navigateur perdu), proposer "Régénérer" qui relance `POST /api/generate`.

**Cas limites :**

- Compteur d'économie = 0% (utilisateur a coché tous les endpoints) → affichage "0% économisé — tu exposes toute la spec". Pas bloquant.

---

### 1.6 Sécurité backend

**Description :** Règles transverses qui s'appliquent au serveur Express.

**Règles métier :**

- R1.6.1 — `POST /api/upload` : multipart/form-data, champ unique `file`. Tout autre champ ignoré.
- R1.6.2 — `POST /api/generate` : application/json, body = `{ parsedSpec, selectedEndpointIds, config }`. Toute clé inconnue dans `config` est ignorée (whitelist stricte côté serveur).
- R1.6.3 — Headers de sécurité minimums (helmet) : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` (en prod).
- R1.6.4 — CORS : autorisé seulement depuis l'origine du front. En dev : `http://localhost:5173`. En prod : domaine de déploiement.
- R1.6.5 — Pas de logs de contenu de spec. Logs serveur = niveau (info/warn/error) + endpoint appelé + IP + durée + status. **Jamais** le body.
- R1.6.6 — Rate limit (express-rate-limit) : 30 req/min/IP par endpoint, fenêtre glissante. Réponse `429` standardisée.
- R1.6.7 — Pas d'exécution dynamique : le code généré est **uniquement** du templating textuel (Handlebars/Eta), aucun `eval`, aucune compilation à la volée. La spec uploadée ne peut pas exécuter de code côté serveur. **Garde-fou CI** : grep automatique en pipeline interdit les occurrences de `eval(`, `new Function(`, `vm.runInContext`, `require(<dynamic>)` dans `src/server/`.
- R1.6.8 — Limite de taille du body JSON sur `/api/generate` : **15 Mo max** (cf. R1.4.1). Middleware `express.json({ limit: '15mb' })`.
- R1.6.9 — Upload multipart : limite du parsing multipart à 10 Mo (cf. R1.1.2), un seul fichier accepté. Tout fichier supplémentaire dans le multipart → ignoré silencieusement.

**Cas d'erreur :**

- Origine CORS non autorisée → bloquée par le navigateur, requête rejetée côté serveur.
- Tentative d'upload avec multipart contenant un champ inattendu → champ ignoré silencieusement.

---

## 2. Specifications visuelles

### 2.1 Design tokens (extraits de `slice-hifi.css` et `BRIEF-CLAUDE-DESIGN.md`)

**Thèmes :** Dark par défaut, light disponible. Toggle utilisateur (à placer dans l'écran 1 ou en topbar — à arbitrer en REFINE).

**Palette — Dark :**
- bg : `#0a0c10`
- bg-soft : `#0f1218`
- bg-card : `#14181f`
- bg-elev : `#1f242d`
- ink : `#e9e7df` (texte principal)
- ink-soft : `#aeada4`
- ink-mute : `#6f706a`
- accent (par défaut "ink") : `#e9e7df` sur bg `#0a0c10`
- Couleurs méthodes HTTP : GET `#6ea4d4`, POST `#8fb56b`, PUT `#d4a85d`, DELETE `#d07474`
- success : `#8fb56b`, warn : `#d4a85d`, error : `#d07474`

**Palette — Light (signature SLICE, indigo sur crème) :**
- bg : `#f8f5ec` (crème chaud)
- bg-card : `#fdfbf3`
- ink : `#2826a8` (indigo profond — couleur de marque)
- ink-soft : `#4f4eb8`
- ink-mute : `#8483c9`
- Méthodes : variations indigo + rouge pour DELETE
- error : `#b22a4a`

**Typographie :**
- **Geist 700** — wordmark "SLICE" uniquement, letter-spacing -0.02em, 17px en topbar.
- **Fraunces italic** — titres éditoriaux (h1 44px, h2 28px, h3 20px) et gros chiffres (compteur d'économie, big numerics 88px).
- **JetBrains Mono** — UI body (13px), code, paths, badges, boutons, inputs.
- Eyebrow (sur-titres petites caps) : JetBrains Mono 10.5px, uppercase, letter-spacing 0.14em.

**Espacements & layout :**
- Grille de **points 14px** en arrière-plan (signature du design system).
- Radius : **5px** (boutons, inputs, méthodes), **8px** (cards), **12px** (dropzone), **99px** (chips, stepper, progress).
- Borders : 1px alpha (`rgba(ink, 0.10)` en dark, `rgba(indigo, 0.20)` en light).
- Topbar : hauteur **48px**, padding horizontal 18px.

**Boutons :**
- Hauteur standard 32px, large 38px, small 26px.
- Primary : background `accent`, color `accent-ink`, font-weight 600.
- Ghost : transparent, ink-soft, highlight au hover.
- Tous : transitions `120ms ease` sur background et border-color.

**Composants clés du design system :**
- `topbar` + `stepper` (pill avec étape courante mise en avant)
- `dropzone` (dashed + repeating gradient 45deg)
- `method` badges (GET/POST/PUT/DELETE — color-mix 8% en background, border 30%)
- `row` (ligne d'endpoint avec hover highlight)
- `card` (avec shadow-card subtile)
- `chip` (filtre actif/inactif)
- `tabs` (uppercase + bottom underline, style pi.dev)
- `kbd` (key cap pour raccourcis clavier)
- `progress` (4px hauteur, accent fill)
- `bignum` (Fraunces italic 88px pour compteur d'économie)
- `check` + `radio` (custom, animés)

---

### 2.2 Écran 1 — Upload

**Description :** Écran d'accueil. Wordmark + tagline + dropzone centrale. Sobriété maximale.

**Composants utilisés :**
- Topbar (wordmark SLICE + breadcrumb "/new" + stepper sur étape 1)
- H1 Fraunces italic : "Curated MCP servers for AI agents"
- Sous-titre JetBrains Mono : "Transforme ton API en serveur MCP en moins de 5 minutes"
- Dropzone (dashed border, hover = highlight)
- Texte aide sous la dropzone : "Glisse ton fichier OpenAPI (JSON ou YAML, max 10 Mo)"
- Footer minimaliste : auteur + lien open source + docs

**États :**
- **Default** : dropzone calme, texte d'aide visible, bouton "Choisir un fichier" centré dans la zone.
- **Hover (drag over)** : dropzone solid border, background highlight, scale 1.005, message "Lâche pour uploader".
- **Uploading** : dropzone remplacée par card avec progress bar 4px + nom du fichier + texte "Lecture de ton fichier…" + dot-pulse.
- **Parsing** : message "Analyse en cours…" + dot-pulse.
- **Error** : dropzone border rouge, message d'erreur en dessous (selon le cas, cf. R1.1), bouton "Réessayer".

**Wireframe ASCII :**
```
┌────────────────────────────────────────────────────────────┐
│ SLICE / new        [1·Upload]──[2]──[3]──[4]    ⌘K  ↻      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│              Curated MCP servers for AI agents              │
│      Transforme ton API en serveur MCP en < 5 minutes       │
│                                                            │
│        ┌──────────────────────────────────────────┐         │
│        │ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ │         │
│        │                                          │         │
│        │       [Choisir un fichier]               │         │
│        │       ou glisse ton fichier ici          │         │
│        │                                          │         │
│        │ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ ╲ │         │
│        └──────────────────────────────────────────┘         │
│        JSON ou YAML · max 10 Mo                            │
│                                                            │
│                                                            │
│  Made by Cedric · open source · docs                        │
└────────────────────────────────────────────────────────────┘
```

**Responsive :**
- Desktop (≥ 1024px) : dropzone max-width 640px, centrée.
- Tablette (768–1023px) : dropzone max-width 480px.
- Mobile (< 768px) : dropzone full width avec padding 24px, hauteur réduite à 200px.

**Accessibilité :**
- Dropzone = `role="button"`, `aria-label="Téléverser un fichier OpenAPI JSON ou YAML, 10 Mo maximum"`.
- Bouton "Choisir un fichier" : focus visible (outline 2px accent), accessible au clavier (Enter, Space).
- Erreurs annoncées via `role="alert"`, `aria-live="polite"`.
- Contraste WCAG AA : ink sur bg ≥ 4.5:1 (validé sur les deux thèmes).

---

### 2.3 Écran 2 — Sélection des endpoints

**Description :** Écran principal. Bandeau supérieur avec nom de l'API détecté + barre d'actions + liste des endpoints + sidebar récap sticky à droite.

**Composants utilisés :**
- Topbar (stepper sur étape 2, breadcrumb "/shopify-admin-api")
- Header : nom de l'API + version (Fraunces italic) + URL de base (inline-editable, JetBrains Mono)
- Barre d'actions : input recherche (avec leading icon `⌘K`) + 3 chips bulk
- Liste : accordéons par tag + rows endpoints (checkbox + libellé + method badge + tooltip path technique)
- Sidebar droite (sticky, width ~280px) : compteur "X / Y endpoints" + bignum % économisé en Fraunces italic + bouton "Continuer →"

**États :**
- **Default** : tous les GET pré-cochés, accordéons ouverts, sidebar à jour, bouton "Continuer" actif si ≥ 1 coché.
- **Loading (parsing en cours, transition depuis écran 1)** : skeleton 8 rows + skeleton sidebar.
- **Empty (théorique, non atteignable car bloqué par R1.1.7)** : message "Aucun endpoint dans cette spec" + bouton "Recharger une spec".
- **Filtré (recherche)** : seules les rows matchant restent visibles, accordéons vides masqués, sidebar compteur reflète le filtré.
- **0 endpoint sélectionné** : bouton "Continuer" désactivé (opacity 0.5, cursor not-allowed).
- **Error (cas exceptionnel post-render)** : toast erreur + bouton "Recommencer".

**Wireframe ASCII :**
```
┌─────────────────────────────────────────────────────────────────────┐
│ SLICE / shopify-admin-api   [✓]─[2·Sélection]─[3]─[4]    ⌘K  ↻     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Shopify Admin API · v2024-01                                       │
│  https://shop.myshopify.com/admin/api  [✎ éditer]                   │
│                                                                     │
│  ┌──────────────────────────────────┐  ┌────────────────────────┐  │
│  │ [⌘K] Rechercher un endpoint…    │  │ 23 / 36 endpoints       │  │
│  └──────────────────────────────────┘  │                         │  │
│  [Tout cocher lectures] [Tout écritures] [Tout décocher]            │
│                                        │   ╱  73%  ╲              │  │
│  ▼ Products  (8)                       │  Fraunces italic        │  │
│   ☑ GET   Lister les produits          │   économisé             │  │
│   ☑ GET   Détails d'un produit         │  vs spec complète       │  │
│   ☐ POST  Créer un produit             │                         │  │
│   ☐ PUT   Modifier un produit          │ [Continuer →]           │  │
│   ☐ DEL   Supprimer un produit         │                         │  │
│                                        └────────────────────────┘  │
│  ▼ Orders  (6)                                                     │
│   ☑ GET   Lister les commandes                                     │
│   ...                                                              │
└─────────────────────────────────────────────────────────────────────┘
```

**Responsive :**
- Desktop : 2 colonnes (liste 1fr + sidebar 280px), sidebar sticky top.
- Tablette : sidebar passe en bandeau fixe en bas (compteur + bouton).
- Mobile : sidebar collapse en bottom sheet, bouton "Continuer" fixe en bas.

**Accessibilité :**
- Chaque endpoint row : `role="checkbox"`, `aria-checked`, label complet (libellé humain + méthode + chemin).
- Accordéons : `aria-expanded`, navigation Tab + Enter pour replier/déplier.
- Recherche : `role="searchbox"`, `aria-label="Filtrer les endpoints"`.
- Compteur : `aria-live="polite"` pour annoncer les changements.
- Raccourci `⌘K` : focus immédiat sur la recherche.

---

### 2.4 Écran 3 — Configuration

**Description :** Formulaire compact + 3 cards pour le mode d'utilisation + bouton "Générer mon MCP".

**Composants utilisés :**
- Topbar (stepper sur étape 3)
- Form : 3 inputs (nom MCP, URL de base, type d'auth radio)
- H2 Fraunces italic : "Où ton agent va l'utiliser ?"
- 3 cards cliquables (radio-like) : "Sur mon ordi" / "Sur un serveur en ligne" / "Les deux" (badge "Recommandé")
- Toggle "⚙️ Options avancées" (déplie une section)
- Bouton primary large : "Générer mon MCP"
- Bouton ghost : "← Retour à la sélection"

**États :**
- **Default** : champs préremplis (auto-détection), aucune card de mode sélectionnée, bouton "Générer" désactivé.
- **Mode sélectionné** : card active = background ink, color bg, border ink. Bouton "Générer" actif.
- **Loading (génération en cours)** : bouton "Générer" → "Création de ton MCP…" + dot-pulse, désactivé. Progress bar fine en haut du bouton.
- **Field error** : bordure rouge sur le champ + message d'erreur en dessous (Fraunces italic 13px).
- **Error global (post-clic Générer)** : toast d'erreur en haut à droite + retour à l'état Default.

**Wireframe ASCII :**
```
┌─────────────────────────────────────────────────────────────────────┐
│ SLICE / configure   [✓]─[✓]─[3·Configuration]─[4]    ⌘K  ↻         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Nom du serveur MCP                                                 │
│  ┌─────────────────────────────────────────────────┐                │
│  │ shopify-admin-api                              │                │
│  └─────────────────────────────────────────────────┘                │
│                                                                     │
│  URL de base de l'API                                               │
│  ┌─────────────────────────────────────────────────┐                │
│  │ https://shop.myshopify.com/admin/api           │                │
│  └─────────────────────────────────────────────────┘                │
│                                                                     │
│  Comment ton API se protège ?                                       │
│  (•) Clé API   ( ) Bearer token   ( ) Aucune                        │
│                                                                     │
│  Où ton agent va l'utiliser ?  (Fraunces italic)                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Sur mon ordi    │  │ Sur un serveur   │  │ Les deux  [Reco] │  │
│  │ Claude Desktop, │  │ en ligne         │  │ Compatible       │  │
│  │ Cursor, Windsurf│  │ n8n, Airia, Zap. │  │ partout          │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│  ⚙️ Options avancées  ▸                                              │
│                                                                     │
│  [← Retour]                            [   Générer mon MCP   ]      │
└─────────────────────────────────────────────────────────────────────┘
```

**Responsive :**
- Desktop : 3 cards en row, max-width 720px centrée.
- Tablette : 3 cards en row, scaling.
- Mobile : 3 cards en column, full width.

**Accessibilité :**
- Cards de mode = `role="radio"` dans un `role="radiogroup"` avec `aria-labelledby` sur le titre.
- Champs avec `<label>` lié + `aria-describedby` pour les messages d'erreur.
- Bouton "Générer" : `aria-disabled="true"` quand inactif.

---

### 2.5 Écran 4 — Succès

**Description :** Confirmation, récap, 3 étapes pour utiliser, snippets de config avec onglets.

**Composants utilisés :**
- Topbar (stepper sur étape 4, breadcrumb "/done")
- Animation SVG check (stroke-dasharray draw, 600ms)
- H1 Fraunces italic : "Ton MCP est prêt"
- Récap row : nom du MCP + nombre d'endpoints + bignum % économisé
- 3 étapes numérotées (Fraunces italic pour les numéros)
- Tabs (Claude Desktop / n8n / Airia) + code block + bouton "Copier"
- 2 CTA secondaires : "Générer un autre MCP" + "Revenir à la sélection"

**États :**
- **Default** : animation check joue, titre apparaît en fade-in 260ms, snippet du premier onglet actif visible.
- **Copié** : toast bottom-right "Copié ✓", bouton "Copier" → "Copié" pendant 1.5s.
- **Onglet désactivé** (mode incompatible) : tab grisée, tooltip "Disponible si tu choisis le mode HTTP".

**Wireframe ASCII :**
```
┌─────────────────────────────────────────────────────────────────────┐
│ SLICE / done   [✓]─[✓]─[✓]─[4·Terminé]    ⌘K  ↻                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                            ╭─╮                                       │
│                            ╰✓╯  (anim draw 600ms)                    │
│                                                                     │
│                    Ton MCP est prêt                                  │
│            (Fraunces italic 44px)                                    │
│                                                                     │
│   shopify-admin-api · 23 endpoints exposés · 73% de contexte gagné  │
│                                                                     │
│   1. Télécharger le ZIP    [↓ Télécharger à nouveau]                 │
│   2. Configurer le .env    [doc →]                                  │
│   3. Connecter à ton agent                                          │
│                                                                     │
│      [CLAUDE DESKTOP] [N8N] [AIRIA]                                  │
│      ┌─────────────────────────────────────────────────┐  [Copier] │
│      │ {                                              │           │
│      │   "mcpServers": {                              │           │
│      │     "shopify-admin-api": {                     │           │
│      │       "command": "node",                       │           │
│      │       "args": ["/chemin/dist/index.js"]        │           │
│      │     }                                          │           │
│      │   }                                            │           │
│      │ }                                              │           │
│      └─────────────────────────────────────────────────┘           │
│                                                                     │
│   [Générer un autre MCP]  [Revenir à la sélection]                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Responsive :**
- Desktop : layout centré, max-width 720px, code block 100% de la zone.
- Mobile : tabs scrollables horizontalement, code block scroll horizontal aussi.

**Accessibilité :**
- Animation respecte `prefers-reduced-motion: reduce` (saute l'anim, affiche directement le check).
- Tabs : `role="tablist"`, navigation flèches gauche/droite, `aria-selected`.
- Code block : `<pre>` + `role="region"` + `aria-label="Configuration pour Claude Desktop"`.
- Bouton "Copier" : `aria-live="polite"` annonce "Copié".

---

### 2.6 Composants transverses

- **Toast** : position top-right, hauteur 40px, slide-in 200ms, auto-dismiss 4s pour succès, 6s pour erreur. ARIA `role="status"` (succès) ou `role="alert"` (erreur).
- **Tooltip** : sur hover/focus, délai 300ms, max-width 280px, fond `bg-elev`, border 1px line. Affiche les détails techniques (`GET /products?limit=...`) sans encombrer l'UI principale.
- **Modal** : non utilisée en MVP. Les actions destructives (Recommencer, navigation arrière) sont assumées sans confirmation, cohérent avec le caractère stateless de l'app.
- **Loading skeleton** : pour la liste d'endpoints pendant le parsing → 8 rows avec barres `--hatch` animées.
- **Dot-pulse indicator** : 3 points qui pulsent, indique opération en cours discrète (parsing, génération).

---

## 3. Parcours utilisateur

### 3.1 Parcours nominal

1. **Écran 1 (Upload)** — utilisateur glisse `shopify-openapi.yaml` (300 Ko) sur la dropzone.
2. Transition : POST `/api/upload`, parsing < 1s, navigation vers Écran 2.
3. **Écran 2 (Sélection)** — utilisateur voit 36 endpoints, GET pré-cochés (23 actifs sur 36). Compteur affiche "73%". Il décoche 2 endpoints non pertinents, clique "Continuer".
4. **Écran 3 (Configuration)** — nom auto-rempli `shopify-admin-api`, URL `https://shop.myshopify.com/admin/api`, type auth "Clé API" avec header `X-Shopify-Access-Token`. Il clique la card "Les deux", puis "Générer mon MCP".
5. Transition : POST `/api/generate`, génération + download < 3s. ZIP `shopify-admin-api.zip` téléchargé.
6. **Écran 4 (Terminé)** — anim check, récap, onglet "Claude Desktop" actif. Il clique "Copier", colle dans `claude_desktop_config.json`, redémarre Claude Desktop, son agent appelle l'API.

### 3.2 Parcours avec erreur de spec

1. Écran 1 — upload d'un fichier `.txt` → toast "Format non supporté, JSON ou YAML uniquement", l'utilisateur reste sur l'écran 1.
2. Upload d'un YAML mal formé → toast "Impossible de lire ton fichier : <raison>". Bouton "Réessayer".
3. Upload d'un fichier valide → parcours nominal.

### 3.3 Navigation arrière (pas de modale en MVP)

- Pas de bouton "Retour à l'upload" depuis l'écran 2 : pour repartir d'une nouvelle spec, l'utilisateur clique **"↻ Recommencer"** dans la topbar (action unique de reset complet, sans modale de confirmation). C'est destructif et assumé.
- Depuis écran 3 : `← Retour à la sélection` garde la spec et la sélection en mémoire (l'utilisateur peut re-cocher).
- Depuis écran 4 : `Revenir à la sélection` garde tout en mémoire client, `Générer un autre MCP` = équivalent de "↻ Recommencer" (retour écran 1, reset complet).
- **Reload de page (F5)** sur n'importe quel écran : la spec parsée vit en mémoire client (React state), elle est perdue au reload. Comportement attendu : retour automatique à l'écran 1 (Upload). Pas de persistance localStorage en MVP (cohérent avec PRD "stateless, pas de stockage").

### 3.4 Raccourcis clavier

- `⌘K` (Cmd+K / Ctrl+K) — focus sur la recherche (écran 2). Indiqué dans la topbar.
- `Esc` — ferme modale ou tooltip ouvert.
- `Enter` sur dropzone — ouvre le sélecteur de fichier.
- `Tab` — navigation séquentielle.

---

## 4. Hors scope confirmé (rappel)

- Pas de compte utilisateur, pas de DB, pas de session persistée entre uploads.
- Pas de preview du code généré dans l'UI (décidé en SPEC).
- Pas de génération Python / Go / autre langage (V1.5+).
- Pas de CLI, SDK, ou API publique (V1.5+).
- Pas de Basic Auth ni OAuth2 amont (V1.5+).
- Pas d'éditeur de code intégré.
- Pas de collaboration / partage / favoris.

---

## 5. Open Questions à arbitrer en ORIENT ou REFINE

- **Templating** : Handlebars vs Eta — léger arbitrage en ORIENT si signal de difficulté ; sinon Handlebars par défaut (plus communautaire).
- **Heuristique tokens** : R1.2.8 propose une heuristique simple, à raffiner en GENERATE après mesure réelle sur 2-3 specs connues (Shopify, Stripe, GitHub).
- **Toggle dark/light** : où le placer ? Topbar à droite (proche du `⌘K`) — à confirmer en REFINE.
- **Localisation** : FR uniquement en MVP. Pas d'i18n. À noter pour V1.5.

---
Généré par le workflow FORGE (phase SPEC). À critiquer via /advisor puis valider par l'utilisateur avant REFINE.
