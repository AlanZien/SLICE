# Specifications : SLICE Cloud (pivot hébergement)

Date : 2026-05-30
Statut : VALIDÉ (2026-05-31)
PRD : .workflow/PRD.md
SPEC de base (MVP ZIP) : .workflow/SPEC.md — **toujours valide pour les écrans 1 (Upload) et 2 (Sélection)**, qui ne changent pas.
Ce document décrit **uniquement les deltas** introduits par le pivot "binaire abandonné → SLICE Cloud + self-host". Tout ce qui n'est pas mentionné ici reste régi par SPEC.md.

---

## 0. Contexte du pivot

Le modèle "ZIP source à télécharger" (SPEC.md §1.4/1.5) est remplacé par **deux modes de livraison hébergée** :

- **Track A — SLICE Cloud** : SLICE déploie le MCP sur l'infra de l'opérateur (VPS OVH + Coolify) via l'**API Coolify**, et renvoie une **URL publique** + un snippet à coller dans l'agent.
- **Track C — Docker self-host** : SLICE génère un **bundle Docker** (code MCP + Dockerfile + compose + doc) que l'utilisateur télécharge et déploie sur **sa propre** infra (Coolify, Railway, Render, Fly, VPS).

Le **Track B** (bouton one-click "Deploy to Railway/Render" sur le compte de l'utilisateur) est **hors scope MVP**, reporté.

### Ce qui change concrètement

| Élément | Avant (SPEC.md) | Après (ce document) |
|---|---|---|
| Écran 3 | Config + question transport (stdio/HTTP/both) | Config + question **hébergement** (SLICE Cloud / Docker) |
| Livraison | ZIP source synchrone | Track A : URL (asynchrone) · Track C : bundle Docker (synchrone) |
| Secrets amont | Env var dans le déploiement de l'utilisateur | Track A : **relai du header `Authorization`** (jamais stockés) · Track C : env var côté utilisateur |
| Écran 4 | Récap + onglets snippets (Claude/n8n/Airia) | Récap + résultat selon le track (URL+snippet OU bundle+instructions) |
| Mode stdio local | Parcours nominal | **Sort du parcours nominal** (le Track C reste utilisable en stdio via la doc du bundle, mais ce n'est plus la voie mise en avant) |

---

## 1. Décisions tranchées (socle validé)

- **D-PIVOT-1** — Périmètre MVP = Track A + Track C. Track B reporté.
- **D-PIVOT-2** — Infra opérateur = VPS OVH + Coolify. Track A déploie via l'**API Coolify**, **1 application Coolify = 1 MCP**. Coolify porte l'orchestration (build, run, domaine, redéploiement). Pas de runtime multi-tenant maison.
- **D-PIVOT-3** — L'écran 3 **ne gagne pas d'étape** : la question "Où ton agent va l'utiliser ?" est **remplacée** par "Où héberger ton MCP ?". Le flow reste à **4 écrans** (PRD : 3 étapes max + succès).
- **D-PIVOT-4** — **Mode relai d'auth** pour les MCP hébergés (Track A) : le MCP relaie le header `Authorization` de chaque requête entrante vers l'API amont. **Aucun secret amont n'est stocké** ni côté SLICE ni côté Coolify. L'URL non-devinable fait office de contrôle d'accès.
- **D-PIVOT-5** — Déploiement Track A **asynchrone** (build Coolify) avec feedback de progression. Track C **synchrone** (téléchargement immédiat).
- **D-PIVOT-6** — Le **déploiement de SLICE lui-même** sur le VPS (Dockerfile SLICE + config Coolify + doc) est une **phase du plan** (Pivot-4), prérequis pour rendre le Track A public.
- **D-PIVOT-7** — Ce pivot **tranche trois open questions du PRD** et requiert un **addendum PRD validé** (capitalisation après validation de cette SPEC) :
  1. Déploiement de SLICE : **Coolify/VPS** retenu (le PRD le laissait ouvert vs Vercel serverless).
  2. Modèle économique : le Track A **est** l'offre "SLICE Hosted" que le PRD listait en open question.
  3. **Le backend n'est plus "stateless 100%"** : le suivi de build asynchrone (RC4.5) introduit un **état serveur in-memory** (pas de DB, mais état mutable). La posture "stateless / pas de DB" du PRD est nuancée : pas de base de données, mais un état éphémère de suivi de déploiement. À acter dans l'addendum.

---

## 2. Spécifications fonctionnelles (deltas)

### 2.1 Écran 3 refondu — Configuration + hébergement

**Description :** mêmes champs auto-détectés qu'en SPEC.md §1.3 (nom MCP, URL de base, type d'auth amont), mais la question transport est remplacée par la question d'hébergement, et **le token de sécurité HTTP descendant disparaît** du parcours nominal (remplacé par le modèle relai / URL-secret).

**Règles métier :**

- **RC1.1** — Champs auto-détectés conservés à l'identique : nom du serveur MCP (SPEC.md R1.3.1), URL de base, type d'auth amont (None / Clé API / Bearer). Mêmes validations.
- **RC1.2** — Question unique obligatoire **"Où héberger ton MCP ?"** — 2 cards en MVP (une 3ᵉ viendra en Pivot-5) :
  1. **"SLICE Cloud"** (badge "Le plus simple") → Track A. Sous-texte : "On l'héberge pour toi, tu reçois une URL prête à coller."
  2. **"Sur mon serveur"** → Track C. Sous-texte : "Tu télécharges un kit prêt à lancer (Coolify, Railway, VPS…)." Mention discrète "kit Docker" pour les devs. **Le mot "Docker" ne figure pas dans le titre du bouton** (vocabulaire humain, PRD).
  - **Vision (post-MVP, Pivot-5)** : 3ᵉ card **"Déployer sur Railway"** → Track B (déploiement one-click sur le compte Railway de l'utilisateur). Hors scope MVP (cf. §6).
- **RC1.3** — Le bouton d'action final est **désactivé** tant qu'aucune card d'hébergement n'est sélectionnée (équivalent SPEC.md R1.3.4). Libellé du bouton adapté au track : "Déployer sur SLICE Cloud" (A) / "Générer le bundle Docker" (C).
- **RC1.4** — Le champ "Token de sécurité HTTP" (`MCP_SERVER_TOKEN`, SPEC.md R1.3.3) **est retiré de l'UI** du parcours nominal (l'utilisateur ne le saisit plus). Mais la **protection descendante reste un Must Have PRD** :
  - **Track A** : l'accès est protégé par l'URL non-devinable (RC4.4). `MCP_SERVER_TOKEN` n'est pas utilisé (mode relai, l'auth d'accès = URL-secret).
  - **Track C** : un `MCP_SERVER_TOKEN` est **généré automatiquement** et inclus dans le `.env.example` du bundle (RC3.2), documenté comme protection recommandée à activer. Le delta vs SPEC.md est l'absence de saisie UI, **pas** la suppression du token.
- **RC1.5** — Option avancée "Inclure les descriptions détaillées des paramètres" (SPEC.md R1.3.3) **conservée**.

**Cas d'erreur :**
- Aucune card sélectionnée + clic → bouton désactivé, pas d'action (feedback par l'état du bouton).
- Champ nom/URL invalide → identique SPEC.md R1.3.5 (bordure rouge + message, bouton désactivé).

**Cas limites :**
- Spec sans `servers` → URL de base vide, saisie manuelle obligatoire avant déploiement (Track A) ou génération (Track C).

---

### 2.2 Mode relai d'auth dans le MCP généré (prérequis Track A)

**Description :** nouvelle variante du template MCP où l'auth amont n'est plus lue dans une variable d'environnement mais **dérivée du header `Authorization` de la requête entrante**, par requête.

**Règles métier :**

- **RC2.1** — Le template MCP accepte un mode `MCP_AUTH_MODE` ∈ { `env` (défaut, comportement actuel), `relay` }.
- **RC2.2** — En mode `relay`, pour chaque requête MCP entrante, le serveur lit le header `Authorization` entrant et l'utilise comme credential amont pour les appels HTTP déclenchés par cette requête :
  - type d'auth amont `bearer` → le header entrant est transmis tel quel à l'API amont (`Authorization: Bearer <…>`).
  - type d'auth amont `apiKey` → la valeur du token entrant est placée dans le header d'API key attendu par l'amont (ex. `X-API-Key: <…>`), extraite de `Authorization: Bearer <…>`.
  - type d'auth amont `none` → aucun header transmis (le header entrant est ignoré).
- **RC2.3** — En mode `relay`, **aucune** des variables `UPSTREAM_API_KEY` / `UPSTREAM_BEARER_TOKEN` n'est requise au démarrage (contrairement à SPEC.md, où leur absence fait échouer le boot). Seule `UPSTREAM_BASE_URL` reste requise.
- **RC2.4** — Si une requête entrante en mode `relay` n'a **pas** de header `Authorization` alors que l'amont exige une auth, l'appel amont part sans credential et l'API renvoie son erreur (401/403), **transmise telle quelle** à l'agent. Conforme au principe "traducteur fidèle" (SPEC.md §0) : SLICE n'invente ni warning ni court-circuit.
- **RC2.5** — Le mode `relay` **ne loggue jamais** la valeur du header `Authorization` (cf. RC4.5).
- **RC2.7** — Robustesse du header entrant en mode `relay` :
  - Header `Authorization` **absent, vide, ou mal formé** (ne matche pas `Bearer <valeur-non-vide>`) → traité comme "pas de credential" (comportement RC2.4 : l'appel amont part sans auth, l'erreur amont est propagée).
  - Header case-insensitive (`authorization` ≡ `Authorization`) ; en cas d'occurrences multiples, la **première** est retenue.
- **RC2.6** — Test E2E de référence : démarrer le MCP en mode `relay`, envoyer une requête `tools/call` avec `Authorization: Bearer TESTTOKEN`, vérifier que la requête sortante vers un amont mocké porte bien `Authorization: Bearer TESTTOKEN` (ou le header d'API key équivalent). Cas couverts par le test : (a) header absent → 401 amont propagé sans masquage ; (b) header mal formé (`Token xyz`, `Bearer ` vide) → traité comme absent (RC2.7).

---

### 2.3 Track C — Bundle Docker self-host

**Description :** au clic "Générer le bundle Docker", SLICE construit le même code MCP qu'avant, **plus** les fichiers de conteneurisation, et renvoie le tout en archive téléchargeable.

**Règles métier :**

- **RC3.1** — Endpoint : réutilise `POST /api/generate` (SPEC.md R1.4.1), avec un champ `delivery: "docker"`. Mêmes garde-fous serveur (re-parsing, whitelist d'ids, limites de taille, rate limit) que SPEC.md R1.4.1bis/ter/5.
- **RC3.2** — Le bundle contient, **en plus** des fichiers SPEC.md R1.4.7 (`src/*`, `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `README.md`) :
  - `Dockerfile` — image Node multi-stage (build TS → run `node dist/index.js`), `EXPOSE 8787`, port pilotable par `PORT`/`MCP_HTTP_PORT`.
  - `docker-compose.yml` — service unique, mapping de port, lecture des secrets depuis `.env`.
  - `.dockerignore`.
  - `.env.example` enrichi : inclut un **`MCP_SERVER_TOKEN` généré automatiquement** (RC1.4) + commentaire expliquant qu'il protège l'accès HTTP descendant (recommandé en self-host exposé).
  - `README.md` enrichi : section "Déployer avec Docker" (`docker compose up -d`) + section "Déployer sur Coolify/Railway/Render" (pointer le service vers le Dockerfile) + note sur l'activation de `MCP_SERVER_TOKEN`.
- **RC3.3** — Le bundle est livré **synchrone** (réponse HTTP directe, in-memory streaming via `archiver`, cf. SPEC.md R1.4.2/R1.4.3). Aucun stockage post-génération (SPEC.md R1.4.6).
- **RC3.4** — Le MCP du bundle démarre en mode `env` par défaut (auth amont via env var — RC2.1), le mode `relay` reste disponible et documenté pour l'utilisateur avancé.
- **RC3.5** — Performance : génération + download du bundle < **5s p95** sur fixture `fixtures/shopify-50.yaml` (identique SPEC.md R1.4.4 ; l'ajout des fichiers Docker ne change pas l'ordre de grandeur).
- **RC3.6** — Test E2E de référence : décompresser le bundle, `docker build`, lancer le conteneur avec un `.env` valide, vérifier que le serveur MCP répond au handshake `initialize` sur le port HTTP. Budget mesuré = **démarrage du conteneur jusqu'au handshake ≤ 3s** (identique SPEC.md R1.4.8). **Hors budget** (non mesurés car dépendants de la machine/réseau) : `docker build`, `docker pull` des layers de base, `npm install`.

**Cas limites :**
- Le `docker build` doit réussir hors-ligne une fois les deps installées (pas de `$ref` réseau, cohérent SPEC.md R1.1.4).

---

### 2.4 Track A — Déploiement SLICE Cloud (via API Coolify)

**Description :** au clic "Déployer sur SLICE Cloud", SLICE crée une application Coolify dédiée, y déploie le code MCP en mode `relay`, attend que le build soit prêt, et renvoie l'URL publique.

**Règles métier :**

- **RC4.1** — Endpoint dédié : `POST /api/deploy`. Body = `{ parsedSpec, selectedEndpointIds, config }` (mêmes re-validation et garde-fous serveur que SPEC.md R1.4.1bis/ter). La spec est re-parsée et la sélection re-filtrée avant tout déploiement. **Limite de body : 15 Mo max** (`express.json({ limit: '15mb' })`, identique SPEC.md R1.4.1/R1.6.8). Au-delà : `413 Payload Too Large`.
- **RC4.2** — Identité du MCP déployé : SLICE génère un **identifiant non-devinable** de **≥ 22 caractères base62** (≈ 128 bits d'entropie, CSPRNG — RC6.5), utilisé comme nom d'application Coolify et comme segment d'URL/sous-domaine. Collision attendue négligeable ; en cas de `409` Coolify, régénérer **une fois** et retenter. Si le 2ᵉ essai échoue aussi (collision persistante ou 409 non lié à une collision de nom) → statut `failed`, code `DEPLOY_NAME_CONFLICT`, message générique "Le déploiement a échoué, réessaie".
- **RC4.3** — Variables d'environnement passées à l'app Coolify au déploiement :
  - `UPSTREAM_BASE_URL` = URL de base validée.
  - `MCP_AUTH_MODE=relay`.
  - `MCP_HTTP_PORT` / `PORT` selon convention Coolify.
  - **Aucun secret amont** (RC2.3 / D-PIVOT-4). SLICE ne transmet jamais de token API utilisateur à Coolify.
- **RC4.4** — Contrôle d'accès au MCP hébergé = **URL non-devinable** (RC4.2). Pas de token de sécurité descendant en MVP. (Durcissement possible en V1.5 : token additionnel, comptes.)
- **RC4.5** — Déploiement **asynchrone** : `POST /api/deploy` renvoie immédiatement un `deploymentId` + statut `pending`. Le front suit l'avancement via `GET /api/deploy/:id/status` (statuts : `pending` → `building` → `ready` | `failed`).
  - Intervalle de polling front : **2s**.
  - Timeout global de déploiement : **180s**. Au-delà → statut `failed`, code `DEPLOY_TIMEOUT`, message utilisateur "Le déploiement a pris trop de temps, réessaie".
  - **Résilience du polling** : un échec réseau ponctuel d'un `GET /status` est retenté (backoff 2s → 4s → 8s). Après **5 échecs consécutifs**, le front abandonne et affiche "Connexion perdue, réessaie" (le build Coolify peut continuer côté serveur — cf. RC4.10 cas limite).
- **RC4.5bis** — Timeout des appels **SLICE → API Coolify** (create app, set env, trigger deploy, get status) : **10s par appel**, distinct du timeout build (180s). Dépassement ou erreur réseau sur un appel API → statut `failed`, code `DEPLOY_BACKEND_UNAVAILABLE`. Un `401/403` de l'API Coolify (token opérateur révoqué/expiré) est mappé sur `DEPLOY_BACKEND_UNAVAILABLE` côté client mais loggé côté serveur comme **incident opérateur distinct** (sans exposer le token).
- **RC4.6** — En statut `ready`, la réponse de statut contient l'**URL publique** du MCP (domaine attribué par Coolify pour l'app). Cette URL est ce que l'utilisateur colle dans son agent.
- **RC4.7** — Secrets de l'**API Coolify** (token d'API, endpoint Coolify) : lus **côté serveur SLICE uniquement**, depuis l'environnement (`COOLIFY_API_URL`, `COOLIFY_API_TOKEN`), jamais exposés au client ni loggés.
- **RC4.8** — Rate limit `/api/deploy` : **10 requêtes/minute/IP** (plus strict que `/api/generate` car une requête = un conteneur réel sur l'infra). Au-delà : `429`.
- **RC4.9** — Aucune persistance applicative côté SLICE en MVP : SLICE ne tient **pas** de base de MCP déployés (pas de dashboard MVP). L'état de vérité vit dans Coolify. Le `deploymentId` est éphémère (durée de vie du suivi de build).
- **RC4.10** — Pas de stockage de la spec ni des secrets après déploiement (cohérent SPEC.md R1.4.6 et D-PIVOT-4).
- **RC4.11** — **Store de suivi in-memory** : le suivi `deploymentId → statut` (RC4.5) est un état serveur **en mémoire** (pas de DB). Règles :
  - Entrée créée au `POST /api/deploy`, **TTL 10 min** après passage en `ready`/`failed`, puis purge.
  - `GET /api/deploy/:id/status` sur un `deploymentId` inconnu/purgé → `404` (code `DEPLOY_NOT_FOUND`).
  - Contrainte MVP : **SLICE Track A tourne en single-instance** (l'état n'est pas partagé entre process). Un restart de SLICE perd les suivis en cours (les apps Coolify déjà créées poursuivent leur build, mais leur URL n'est plus récupérable côté front — limite assumée, cf. RC4.10 cas limite). Multi-instance/store partagé → V1.5.
- **RC4.12** — **Compensation des orphelins Coolify** : la séquence de déploiement (create app → set env → trigger deploy) est **best-effort transactionnelle**. Si une étape échoue après la création de l'app Coolify, SLICE tente un **delete best-effort** de l'app partiellement créée avant de renvoyer `failed`. Si le delete échoue aussi, l'incident est loggé côté opérateur (orphelin à nettoyer). Un **GC d'orphelins** (apps Coolify sans suivi actif) est cadré en Pivot-4.
- **RC4.13** — **Idempotence / anti-double-déploiement** : le front **bloque tout nouveau `POST /api/deploy`** tant qu'un déploiement est `pending`/`building` (bouton désactivé + état). Garde-fou serveur : le rate limit RC4.8 (10/min/IP) limite l'amplification, mais ne garantit pas l'unicité — l'unicité est assurée côté UI en MVP. Clé d'idempotence serveur → V1.5.

**Cas nominaux :**
- 23 endpoints, Track A → `POST /api/deploy` renvoie `pending` ; après ~30s de build, statut `ready` + URL `https://<id>.<domaine-opérateur>` ; le front affiche l'écran 4 avec l'URL et le snippet.

**Cas d'erreur :**
- API Coolify injoignable / 5xx → statut `failed`, code `DEPLOY_BACKEND_UNAVAILABLE`, message "L'hébergement est indisponible, réessaie dans un moment". Aucun détail technique Coolify exposé au client.
- Build Coolify échoue (code MCP invalide — ne devrait pas arriver, code généré testé) → statut `failed`, code `DEPLOY_BUILD_FAILED`, message "La création de ton MCP a échoué, recommence".
- Timeout > 180s → RC4.5.
- Rate limit dépassé → `429`, message "Trop de déploiements d'affilée, réessaie dans une minute".

**Cas limites :**
- Spec à 1 endpoint → déploiement valide, 1 tool.
- Collision d'identifiant Coolify → régénération unique puis retry (RC4.2).
- Utilisateur quitte la page pendant le build → le déploiement Coolify continue (best effort), mais sans persistance SLICE l'URL n'est plus récupérable côté front. Acceptable en MVP (assumé, comme le reload F5 de SPEC.md §3.3). À documenter comme limite connue.

---

### 2.5 Écran 4 refondu — Résultat selon le track

**Description :** l'écran de succès s'adapte au track choisi. Le composant `ConnectionTabs` existant est refondu pour le mode URL.

**Règles métier — Track A (SLICE Cloud) :**

- **RC5.1** — Pendant le build (statuts `pending`/`building`) : état **"Déploiement en cours…"** avec progression (dot-pulse / barre indéterminée) et message rassurant **sans durée chiffrée en dur** ("On installe ton MCP, c'est bientôt prêt…"). Si le build dépasse **60s**, afficher un message d'attente prolongée ("Ça prend un peu plus longtemps que d'habitude, on continue…") jusqu'au timeout RC4.5.
- **RC5.2** — En statut `ready` : affichage de l'**URL publique** (champ copiable, bouton "Copier") + récap (nom MCP, nombre d'endpoints, % de contexte économisé — snapshot identique à l'écran 2, cf. SPEC.md R1.5.6).
- **RC5.3** — Snippet de connexion en **mode URL** (remplace les snippets stdio), avec onglets agent **Claude / n8n / Airia**. **Les règles SPEC.md R1.5.8/5.9/5.10 (onglets grisés selon le mode transport) sont abrogées** : en mode URL, les 3 onglets sont **toujours actifs** (Claude par défaut). Chaque snippet contient :
  - `url:` = URL publique déployée.
  - `headers: { Authorization: Bearer COLLE_TON_TOKEN_ICI }` — placeholder explicite à remplacer par le token de l'API cible de l'utilisateur (relayé, RC2.2).
  - Bouton "Copier" (toast "Copié", identique SPEC.md R1.5).
- **RC5.4** — En statut `failed` : message d'erreur (RC4 cas d'erreur) + action de reprise **adaptée au code** :
  - `DEPLOY_TIMEOUT`, `DEPLOY_BACKEND_UNAVAILABLE`, `DEPLOY_NAME_CONFLICT` → **retry-ables** : bouton "Réessayer le déploiement" (relance `POST /api/deploy`).
  - `DEPLOY_BUILD_FAILED` → **non retry-able** (un build invalide rééchouera à l'identique) : bouton "Recommencer depuis le début" (retour écran 1).

**Règles métier — Track C (Docker) :**

- **RC5.5** — Téléchargement automatique du bundle au montage (réutilise le hook `useDownload`, idempotent StrictMode-safe) + bouton "Télécharger à nouveau" (SPEC.md R1.5.1).
- **RC5.6** — Instructions de déploiement : section "Lance-le avec Docker" (`docker compose up -d`) + "Déploie-le sur Coolify/Railway/Render". Snippets agent en mode URL avec **placeholder d'hôte** (`https://TON-HOTE`) que l'utilisateur remplace après déploiement, + `Authorization: Bearer COLLE_TON_TOKEN_ICI`.

**Règles communes :**

- **RC5.7** — CTA secondaires : "Générer un autre MCP" (reset, retour écran 1) + "Revenir à la sélection" (garde la spec en mémoire). Identique SPEC.md R1.5.7.
- **RC5.8** — Le mode stdio (snippet `command: node …`) disparaît du parcours nominal. Il reste documenté dans le README du bundle Track C pour l'usage local.

---

### 2.6 Sécurité (deltas)

- **RC6.1** — `COOLIFY_API_TOKEN` / `COOLIFY_API_URL` : secrets opérateur, lus côté serveur uniquement, jamais renvoyés au client, jamais loggés (RC4.7).
- **RC6.2** — Secrets utilisateur (tokens des API cibles) : **jamais reçus, jamais stockés** par SLICE en Track A (modèle relai, D-PIVOT-4). En Track C, ils ne quittent jamais l'infra de l'utilisateur.
- **RC6.3** — Logs : aucun header `Authorization` (entrant ou relayé), aucune valeur de token, aucun contenu de spec (prolonge SPEC.md R1.6.5).
- **RC6.4** — `POST /api/deploy` : whitelist stricte du body (mêmes règles que SPEC.md R1.6.2), rate limit dédié RC4.8.
- **RC6.5** — L'URL non-devinable (≥ 128 bits) est la frontière d'accès du MCP hébergé en MVP : elle doit être générée avec un CSPRNG (`crypto.randomBytes`), jamais un PRNG faible. Une URL inconnue côté reverse-proxy/Coolify renvoie un `404` uniforme (ne révèle pas l'existence d'autres MCP). Rate-limit sur le MCP hébergé → V1.5 (à 128 bits le scan est négligeable).
- **RC6.6** — Mode relai : SLICE/le MCP hébergé **n'ajoute aucun header sortant non sollicité** et propage le corps de réponse amont tel quel (RC2.4, principe traducteur fidèle). Si l'API amont écho le token dans son corps d'erreur, ce corps appartient à l'agent appelant — assumé. Test : vérifier que la requête sortante ne contient que les headers attendus (auth relayée + `Content-Type`), aucun header injecté par SLICE.

---

## 3. Parcours utilisateur (deltas)

### 3.1 Nominal — Track A (SLICE Cloud)
1. Écrans 1-2 inchangés (upload, sélection).
2. Écran 3 — config auto-remplie + clic card **"SLICE Cloud"** + clic **"Déployer sur SLICE Cloud"**.
3. `POST /api/deploy` → écran 4 en état "Déploiement en cours…" (polling 2s).
4. Statut `ready` → URL affichée + snippet (onglet Claude actif). L'utilisateur copie, colle dans son agent, **remplace `COLLE_TON_TOKEN_ICI`** par le token de son API cible.

### 3.2 Nominal — Track C (Docker)
1. Écrans 1-2 inchangés.
2. Écran 3 — clic card **"Sur mon serveur (Docker)"** + clic **"Générer le bundle Docker"**.
3. `POST /api/generate?delivery=docker` → bundle téléchargé (synchrone).
4. Écran 4 — instructions Docker + snippet URL avec placeholder d'hôte + token.

### 3.3 Erreurs
- Track A timeout/échec backend → message dédié + "Réessayer" (RC4 cas d'erreur).
- Reload F5 pendant un build Track A → retour écran 1, URL non récupérable (limite assumée, RC4.10 cas limite).

---

## 4. Découpage en phases pressenti (à détailler en REFINE)

1. **Pivot-1 — Track C (Docker bundle)** : écran 3 refondu (RC1), Dockerfile/compose dans le bundle (RC3), écran 4 self-host (RC5.5/5.6), snippets URL (RC5.3 forme). Zéro dépendance externe.
2. **Pivot-2 — Mode relai d'auth** : variante `MCP_AUTH_MODE=relay` du template MCP (RC2). Prérequis du Track A.
3. **Pivot-3 — Track A (SLICE Cloud)** : `POST /api/deploy` + intégration API Coolify + suivi asynchrone (RC4), écran 4 cloud (RC5.1-5.4). Testable en local contre le Coolify de l'opérateur.
4. **Pivot-4 — Déploiement de SLICE** : Dockerfile SLICE + config Coolify + doc + secrets opérateur (RC6.1). Rend le Track A public.

---

## 5. Open questions résiduelles (à trancher en ORIENT/REFINE)

- **OQ-1** — Forme exacte de l'URL Track A : sous-domaine wildcard (`https://<id>.mcp.domaine`) vs path (`https://mcp.domaine/<id>`). Dépend de la config DNS/wildcard du VPS. À trancher en Pivot-3 (impacte la conf Coolify).
- **OQ-2** — API Coolify : endpoints exacts (création app, set env, trigger deploy, statut), authentification, et si le déploiement se fait par image Docker pré-buildée ou par Dockerfile/source. À cadrer par recherche en début de Pivot-3.
- **OQ-3** — Implémentation du relai (RC2.2) avec le `StreamableHTTPServerTransport` : comment threader le header entrant jusqu'au client HTTP amont par requête (contexte de session vs middleware). Spike léger possible en début de Pivot-2.
- **OQ-4** — Faut-il garder `POST /api/generate` (ZIP source nu) en parallèle pendant la transition, ou le déprécier immédiatement au profit de `delivery: docker` ? Proposé : déprécier le ZIP nu, ne garder que le bundle Docker.

---

## 6. Hors scope confirmé (MVP pivot)

- Track B (one-click Railway/Render sur le compte utilisateur) — V1.5.
- Comptes utilisateur, dashboard de gestion des MCP déployés, facturation — V1.5+.
- Token de sécurité descendant additionnel (au-delà de l'URL-secret) — V1.5.
- Stockage/chiffrement de secrets utilisateur côté SLICE — explicitement refusé (D-PIVOT-4).
- Persistance des déploiements côté SLICE (base de données) — V1.5.
- Mode stdio dans le parcours nominal — reste en doc du bundle Track C uniquement.

---
Généré par le workflow FORGE (phase SPEC — pivot SLICE Cloud). À critiquer via /advisor puis valider par l'utilisateur avant REFINE.
