# Positionnement marché — SLICE

Date : 2026-05-27
Statut : actif (à relire avant les phases 06 / 10 / marketing)

## Recadrage post-étude concurrentielle (2026-05-27)

L'hypothèse initiale du PRD selon laquelle "accepter une spec OpenAPI privée pour générer un MCP" est un différenciateur **est invalidée**. Le marché traite déjà ce cas :

| Concurrent | Spec privée | Type | Audience cible |
|---|---|---|---|
| Speakeasy | ✅ | Freemium SaaS + CLI | Développeurs |
| Mintlify | ✅ | Freemium SaaS | Équipes doc / DevRel |
| FastMCP | ✅ | Open source Python | Développeurs Python |
| openapi-mcp-server | ✅ | Open source | Développeurs |
| Stainless | ✅ (passé) | Racheté Anthropic mai 2025 | Statut MCP grand public flou |
| Postman MCP Generator | ❌ | Gratuit SaaS | Catalogue public uniquement |
| Cloudflare | ❌ | Cloud Workers | Écosystème Cloudflare |

Conclusion : **"générer un MCP depuis OpenAPI" est banalisé**. Postman est l'exception, pas la règle.

## Les vrais différenciateurs SLICE (à exploiter en marketing et UX)

### 1. UX "non-tech first" — différenciateur principal
Speakeasy, Mintlify, FastMCP sont **conçus pour des développeurs** : CLI, fichiers de config YAML, langage technique. Le segment "utilisateur qui sait pas coder mais veut un MCP pour son agent" n'est servi par personne sérieusement.

Promesse SLICE : **vocabulaire humain, 3 écrans, auto-détection maximale, pas une ligne de YAML à écrire**.

### 2. Dual transport stdio + HTTP exposé dès l'écran de configuration
Speakeasy supporte les deux mais demande de configurer manuellement. Mintlify : non clair côté UI.

Promesse SLICE : **3 cards de choix (Claude Desktop / agents cloud / les deux) au lieu d'un champ technique "transport"**.

### 3. Compteur d'économie de contexte
Aucun concurrent ne le fait visuellement. Argument marketing concret et chiffré que l'utilisateur peut citer à son boss.

### 4. Curation visuelle des endpoints
Speakeasy filtre via fichier de config YAML. SLICE : checkboxes, groupement par tag, recherche temps réel, libellés humains.

### 5. Positionnement explicite "pensé pour n8n / Airia / Claude Desktop"
Speakeasy reste générique SDK-first. SLICE assume les 3 cibles d'agent et fournit les snippets adaptés à l'écran 4.

## Concurrent à surveiller en priorité : Speakeasy

- URL : https://www.speakeasy.com/docs/standalone-mcp/build-server
- Plus mature techniquement (SDK historique, CLI puissante)
- Faiblesse : UX très dev-centric, friction d'onboarding pour un non-dev
- À monitorer : s'ils ajoutent une UI web grand public, ils nous prennent notre angle

## Implications à intégrer dans les phases

### Phase 06 — Écran 3 (configuration)
- Vocabulaire des cards de mode : pas "stdio / HTTP" en dur, mais "Claude Desktop" / "Agents cloud (n8n, Airia)" / "Les deux"
- Tooltips power-user qui révèlent les termes techniques (cf. décision PRD)

### Phase 10 — Écran 4 (succès)
- Snippets Claude Desktop / n8n / Airia mis en avant
- Compteur d'économie de contexte affiché en gros (snapshot écran 2 → écran 4)
- CTA "Générer un autre" pour favoriser l'itération

### Communication / landing
- Headline : "Transforme ton API en MCP en 3 clics, sans coder, prêt pour Claude / n8n / Airia"
- Sous-headline qui parle d'économie de contexte
- Anti-positionnement assumé : "On n'est pas un SDK, on est un studio."

## Anti-positionnement (où SLICE ne joue PAS)

- Pas de multi-langage de sortie (TS only MVP, Python V1.5). Stainless / Speakeasy gagneront sur ce terrain.
- Pas de génération de SDK complet. SLICE génère des **MCPs**, point.
- Pas d'usage CLI/DevOps. Si l'utilisateur cherche `npx generate-mcp`, il ira chez Speakeasy.

## Inflexion stratégique — API publique + MCP SLICE (2026-05-28)

Discussion produit : le PRD prévoit l'API publique en V1.5. **À reconsidérer : la sortir en V1.1-V1.2, juste après le MVP web.**

Raisonnement :
- Exposer une API publique permet de générer un **MCP SLICE** (méta-MCP) qu'un agent (Claude Desktop, n8n, Airia) ajoute à son stack une fois
- Une fois installé, l'agent peut générer n'importe quel MCP en langage naturel : *"crée-moi un MCP Shopify pour produits/prix/catégories"* → l'agent appelle SLICE → ZIP généré → installé
- Pattern "agent qui s'auto-équipe" : différenciateur fort face à Speakeasy (dev-centric, pas pensé agent)
- L'app web reste indispensable (acquisition non-tech, démo, conversion) — l'API ne la remplace pas, elle la prolonge

Conditions techniques :
- API doit être **stable, versionnée (`/v1/generate`), documentée en OpenAPI publique, authentifiée**
- Endpoint dédié `/v1/suggest-endpoints` à prévoir : mapping texte libre ("produits, prix") → opérations OpenAPI (sinon l'agent ne sait pas quoi cocher)
- Auth amont configurable par l'agent (Shopify = API key custom app ou OAuth selon contexte)

À arbitrer : promouvoir l'API + MCP SLICE en feature phare de V1.1 plutôt qu'en commodité tardive V1.5.

## Registres / annuaires MCP (canaux de distribution, pas concurrents directs)

Catégorie différente des générateurs de code : les **annuaires de MCPs déjà écrits**. Ils référencent et distribuent, ils ne génèrent pas. Donc plutôt **partenaires de distribution potentiels** que concurrents.

Analogie : Smithery = npm/App Store des MCPs (catalogue de produits finis). SLICE = usine qui fabrique le produit. Pipeline naturel : SLICE génère → publie sur Smithery → users découvrent via catalogue → install one-click.

Risque concurrentiel **uniquement** si l'un d'eux ajoute un générateur custom — pas leur ADN aujourd'hui.

| Acteur | Type | Force | Risque pour SLICE |
|---|---|---|---|
| Smithery.ai | Registre + install one-click | ~5000 MCPs, devient "npm des MCPs" | Effet de réseau communauté |
| mcp.so | Annuaire communautaire | Gros volume | Qualité inégale |
| Anthropic MCP Registry | Officiel (en construction) | Légitimité + distribution Claude | **Existentiel** si Anthropic pousse fort |
| Pulse MCP, Glama | Agrégateurs | Niches | Faible |
| Composio, Zapier MCP | MCP pour SaaS intégrations | Catalogue d'intégrations existant | Chevauchent scope SLICE |

**Ne PAS se positionner comme "registre".** Suicide frontal — pas la communauté Smithery, pas la légitimité Anthropic.

**Positionnement à tenir : "usine à MCPs custom" vs "catalogue de MCPs finis"**
- Smithery = *le* MCP Shopify officiel, 400 endpoints, générique
- SLICE = *ton* MCP Shopify, 12 endpoints, ton auth, tes besoins
- Coexistence : SLICE peut publier ses MCPs générés sur Smithery / Anthropic Registry (distribution). Bouton "régénère-le sur-mesure avec SLICE" depuis un registre = upsell naturel.

**Vrai risque existentiel = Anthropic.** Si Anthropic sort un outil officiel "OpenAPI → MCP" (techniquement trivial pour eux), la pure conversion meurt. Défense :
- Curation UX (vocabulaire humain, sélection 3 clics) — déjà fait
- Hosting + observabilité + auto-update sur changement de spec — SLICE Hosted
- Spécialisation workflows agents (n8n, Airia) — niche que les gros ignorent

## Risque "l'agent génère le MCP lui-même" (sans SLICE)

Question légitime : un LLM peut écrire un MCP depuis une doc OpenAPI. Pourquoi SLICE ?

Réponses qui tiennent **aujourd'hui** :
1. **Déterminisme** — templates testés, même input → même output. Code généré par LLM = qualité variable, bugs aléatoires (pagination, retry, rate limit mal gérés)
2. **Coût/temps** — 500ms gratuit vs 30s + tokens à chaque génération. Critique pour usage n8n/Airia (dizaines de MCPs)
3. **Curation** — SLICE applique des règles de sélection cohérentes (12 endpoints qui comptent sur 400). LLM expose tout ou invente
4. **Compteur d'économie de contexte mesuré** — argument chiffré que le LLM ne fournit pas

**Mais la frontière bouge.** Dans 12-18 mois, Claude 5 / GPT-6 généreront des MCPs de qualité prod. Survie SLICE = **pivoter de "générateur" vers "plateforme MCP managée"** (hosting + monitoring + auth + mise à jour auto + observabilité). C'est ce que SLICE Hosted prépare déjà — accélérer.

## Modèle économique — Comment monétiser API / MCP SLICE (2026-05-28)

Principe directeur : **ne jamais facturer la simple génération à l'acte**. C'est commoditisable (LLM frontière dans 12-18 mois). Facturer ce qui dure et que personne ne peut faire à la place : **hosting, observabilité, fraîcheur, auth managée**.

### Modèles évalués

| Modèle | Verdict | Pourquoi |
|---|---|---|
| Pay-per-use API (0,50 €/gen) | ❌ Non | Coût marginal trop bas, paraît racketteur, risque commoditisation |
| Abonnement par clé API (tier mensuel) | ⚠️ OK mais pas suffisant | Modèle Speakeasy/Mintlify, classique mais pas différenciant |
| **Freemium API + SLICE Hosted payant** | ✅ **Reco** | Aligne valeur sur ce qui dure (hosting récurrent), cohérent avec PRD |
| BYO key + % sur appels routés | ⏳ V2+ | Trop tôt, complexité proxying, méfiance |
| Enterprise self-hosted | ⏳ V2+ | Marges énormes mais cycle vente long, après 50 clients SaaS |

### Structure tarifaire pressentie

| Plan | Web | API (génération) | MCPs hébergés | Prix |
|---|---|---|---|---|
| Free | illimité | 50 gen/mois | 1 MCP hébergé | 0 € |
| Pro | illimité | 500 gen/mois | 10 MCPs hébergés | 19 €/mois |
| Team | illimité | illimité | 50 MCPs hébergés + observabilité | 79 €/mois |
| Enterprise | self-hosted | sur devis | illimité | 5k€+/an |

### Logique de la structure

- **Gratuit (web + API limitée)** = acquisition non-tech via le web, découverte sans friction
- **Hosting payant** = valeur récurrente vendue. Justification claire : "ton MCP doit tourner 24/7, rester à jour quand l'OpenAPI source change, être monitoré, gérer l'auth"
- **API en pay-per-use évitée** = on ne facture pas l'acte ponctuel (génération), on facture l'usage long terme (hébergement)

### Pourquoi ce modèle protège SLICE contre la commoditisation LLM

Quand Claude 5 / GPT-6 généreront des MCPs de qualité prod (12-18 mois) :
- La génération brute perd sa valeur → mais SLICE ne facture pas la génération
- L'hosting + observabilité + auto-update restent → SLICE garde sa valeur récurrente
- C'est exactement le pivot "générateur → plateforme MCP managée" évoqué plus haut

### Conditions techniques requises

- Hosting MCP en HTTP Streamable scalable (Coolify/VPS ou Vercel/Fly selon décision SPEC)
- Mécanisme de détection de changement OpenAPI source (webhook ou polling) + régénération auto
- Observabilité par MCP : nombre d'appels, latence, erreurs, tokens économisés cumulés
- Auth managée : stockage chiffré des credentials amont (Shopify token, Stripe key), rotation

## À ré-examiner

- [ ] Quand un trafic réel arrive, mesurer le profil des utilisateurs (devs vs non-devs) pour valider l'hypothèse de segment
- [ ] Surveiller Speakeasy tous les 3 mois : sortie d'une UI web grand public = signal d'alerte
- [ ] Si Anthropic ressort Stainless en consumer ou sort un MCP Registry officiel poussé, ré-évaluer (concurrent avec leur distribution = jeu changé)
- [ ] Arbitrer la promotion API publique + MCP SLICE en V1.1/V1.2 (vs V1.5 actuel)
- [ ] Surveiller Smithery.ai tous les 3 mois (volume catalogue, fonctionnalités custom — risque uniquement s'ils ajoutent un générateur, ce qui n'est pas leur ADN actuel)
- [ ] Mesurer en continu la qualité du code MCP généré par les LLMs frontière (signal de bascule plateforme vs générateur)
- [ ] Valider la grille tarifaire (Free/Pro/Team/Enterprise) avec 10 prospects avant phase SLICE Hosted
- [ ] Tester le pricing du hosting : 9 €/MCP/mois unitaire vs forfaits 10/50 MCPs — quel modèle convertit mieux ?
