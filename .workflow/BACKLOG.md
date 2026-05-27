# Backlog

Liste append-only des features et idees a developper.
A consulter en fin de DELIVER pour proposer la prochaine feature.

## Features prioritaires

- [ ] {{Premiere idee a developper}}

## Features secondaires

- [ ] {{Idee moins prioritaire mais prevue}}

## Upload par URL (V1.1) — issu de feedback UX 2026-05-27

Actuellement seul le drag&drop / file picker est disponible sur l'écran 1. Beaucoup d'APIs publient leur OpenAPI à une URL bien connue (`https://api.stripe.com/openapi.json`, etc.). Permettre le paste d'URL réduit la friction et colle au positionnement "3 clics".

**Protections SSRF obligatoires** (sinon vulnérabilité critique) :
- [ ] Schémas autorisés : `https://` uniquement (bloquer `file://`, `gopher://`, `ftp://`, `http://`)
- [ ] Bloquer les IPs privées (RFC 1918, loopback, link-local) après résolution DNS — pas seulement sur le hostname (anti DNS rebinding)
- [ ] Timeout strict (5s)
- [ ] Limite de taille 10 Mo (vérifier `Content-Length` + recheck en streaming)
- [ ] Max 3 redirects, chaque hop re-vérifié anti-SSRF
- [ ] User-Agent identifiable : `SLICE/1.0 (+https://slice.dev)`
- [ ] Codes d'erreur dédiés : `URL_INVALID`, `URL_FETCH_FAILED`, `URL_PRIVATE_IP_BLOCKED`, `URL_TIMEOUT`

**UI** :
- [ ] Toggle "Coller une URL / Glisser un fichier" sur l'écran 1
- [ ] Validation côté client : URL `https://` valide avant submit

**Lib recommandée** : `undici` avec custom dispatcher, ou wrapper SSRF-safe écrit maison. NE PAS utiliser `axios` brut.

## MCP multi-API (V1.5+) — issu de réflexion produit 2026-05-27

Aujourd'hui SLICE génère 1 MCP depuis 1 OpenAPI. Postman permet de piocher des endpoints depuis plusieurs APIs publiques et de les bundler dans un seul MCP. Intérêt : workflows agents cross-API (ex : "ops e-commerce" = Stripe + Shopify + Slack), économie de friction de config Claude Desktop, curation par cas d'usage métier plutôt que par éditeur.

- [ ] Upload multiple specs OpenAPI dans une même session
- [ ] Écran de sélection multi-onglets (un onglet par API uploadée)
- [ ] Gestion des conflits de naming entre `operationId` de specs différentes (préfixage par nom d'API)
- [ ] Configuration multi-auth dans l'écran 3 (un bloc credentials par API source)
- [ ] Génération d'un MCP unique avec routing par préfixe de tool
- [ ] Snippets de config Claude Desktop / n8n / Airia adaptés (un seul serveur, plusieurs auths à fournir)
- [ ] UX de "workspace MCP" : sauvegarde côté client de la sélection multi-API pour itérer (sans persistance serveur)

## Qualification avancée de la spec (V1.1) — issu de réflexion qualité 2026-05-27

Le MVP fait du filtrage léger (3 règles dures, cf. phase 04 tâche 12). La qualification avancée est reportée pour limiter le scope MVP.

- [ ] Intégrer Spectral (linter OpenAPI open source) avec règles custom MCP-oriented
- [ ] Rapport qualité détaillé (✅ utilisable / ⚠️ dégradé / ❌ rejeté) affiché avant l'écran de sélection
- [ ] Détection prompt injection dans les descriptions OpenAPI (patterns "ignore previous instructions", etc.) — surface d'attaque MCP documentée
- [ ] Marquage des endpoints destructifs (DELETE, POST critiques) dans le code MCP généré (warning côté agent)
- [ ] Détection automatique du pattern de pagination (cursor / offset / page) et injection d'un helper dans le MCP
- [ ] Extraction des `x-rate-limit-*` extensions pour exposer les hints côté MCP
- [ ] Support OAuth2 (auth amont MCP → API) — débloque le rejet dur du MVP
- [ ] Support Basic Auth (idem)
- [ ] Validation sémantique : cohérence requestBody/responses, schémas $ref cassés, types inconsistants

## Idees a clarifier

- [ ] {{Idee floue qui demande un brainstorm avant de devenir une feature concrete}}

---
Alimente librement par l'utilisateur (ajout d'idees, reorganisation).
Cochee automatiquement par FORGE en phase DELIVER quand une feature est livree.
