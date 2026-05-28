# Salesforce Headless 360 — Recherche & convergences avec SLICE

**Préparé :** 2026-05-28
**Scope :** Comprendre Salesforce Headless 360 (annoncé TDX 2026, relayé à l'Agentforce World Tour Paris) et identifier uniquement les convergences réelles avec SLICE, sans en inventer.
**Profondeur :** Deep dive

---

## Executive Summary

Salesforce Headless 360, annoncé à TDX 2026 (San Francisco, 15 avril 2026) puis largement relayé à l'Agentforce World Tour Paris du 21 mai 2026, expose l'intégralité de la plateforme Salesforce (CRM, Data Cloud, Agentforce, Slack) sous trois formes : **API REST, outils MCP natifs (60+), et commandes CLI**. C'est une bascule stratégique vers une architecture API-first pensée pour les agents IA.

**Convergence avec SLICE** : Salesforce valide publiquement la thèse centrale de SLICE — **MCP est le nouveau standard d'accès des agents IA aux systèmes existants**. Le marché et le protocole sont les bons.

**Non-convergence à assumer** : Salesforce livre lui-même ses MCP servers (hébergés, OAuth, façades de curation). Pour la plateforme Salesforce *elle-même*, SLICE n'a aucune utilité — Salesforce s'auto-suffit. Les zones de convergence réelle se situent **à côté de Salesforce**, pas dedans.

---

## Background

Le Model Context Protocol (MCP), standard ouvert publié par Anthropic en novembre 2024, est devenu en 18 mois la couche d'intégration standard entre LLMs/agents et systèmes tiers. En 2026, les éditeurs majeurs (Anthropic, OpenAI, Google, Microsoft, Salesforce, Notion, Docusign) publient leurs propres MCP servers.

L'annonce Salesforce Headless 360 marque un cap : un éditeur SaaS de premier plan **renonce explicitement à l'interface comme moyen d'accès principal** au profit d'une exposition agent-native. Citation officielle : *"No Browser Required"*.

SLICE, démarré en mai 2026, parie exactement sur la même bascule : générer des serveurs MCP à partir d'une spec OpenAPI pour des **API tierces qui n'ont pas (encore) de MCP officiel**, avec une UX pensée pour des utilisateurs non-techniques.

---

## Key Findings

### 1. Ce qu'est exactement Headless 360

Trois surfaces simultanées pour chaque capacité Salesforce :
- **API REST** (déjà existante historiquement, désormais documentée et systématisée)
- **MCP tools** : 60+ outils natifs MCP, dont le **Data 360 MCP Server** (developer preview)
- **CLI** : commandes `sf` exécutables depuis terminal/pipeline/agent

Le Data 360 MCP Server est intéressant techniquement : il **consolide ~200 opérations REST derrière 3 outils de façade** (`search`, `payload_examples`, `execute`). C'est un pattern de curation extrême pour rester sous la fenêtre de contexte des LLMs.

- Source : [Introducing the Data 360 MCP Server — Salesforce Developers Blog](https://developer.salesforce.com/blogs/2026/05/introducing-the-data-360-mcp-server-developer-preview)

### 2. Authentification : OAuth uniquement

Les Salesforce Hosted MCP Servers reposent sur **OAuth** pour permettre à Claude, ChatGPT, Cursor ou un agent custom d'agir au nom d'un utilisateur autorisé. Pas d'API Key, pas de Bearer simple.

C'est cohérent avec un CRM qui gère des données client sensibles, mais c'est une **incompatibilité directe avec le MVP SLICE** qui ne supporte que None / API Key / Bearer (OAuth2 reporté en V1.5).

- Source : [Salesforce Headless 360 and the MCP Standard — Cirra](https://cirra.ai/articles/salesforce-headless-360-mcp-standard)

### 3. Public cible : agents de coding, pas no-code

Salesforce vise explicitement **Claude Code, Cursor, Codex, Windsurf, VS Code** — des outils utilisés par des développeurs Salesforce (admins, devs ISV, intégrateurs). Le discours marketing parle d'un "builder gap" qui s'élargit : ceux qui savent piloter un agent vs les autres.

SLICE vise au contraire des **utilisateurs non-tech** qui veulent générer un MCP en 3 clics pour leur stack (n8n, Airia). Les publics ne se chevauchent pas.

- Source : [TDX 2026 Reporter's Notebook — SalesforceDevops.net](https://salesforcedevops.net/index.php/2026/04/15/tdx-2026-reporters-notebook-salesforce-goes-headless-and-widens-the-builder-gap/)

### 4. AgentExchange — marketplace MCP

Salesforce a lancé AgentExchange en parallèle : **10 000 apps Salesforce, 2 600+ apps Slack, 1 000+ agents/tools/MCP servers** d'éditeurs partenaires (Google, Docusign, Notion). C'est l'équivalent d'un App Store pour MCP servers dans l'orbite Salesforce.

- Source : [Salesforce Headless 360 — VentureBeat](https://venturebeat.com/technology/salesforce-launches-headless-360-to-turn-its-entire-platform-into-infrastructure-for-ai-agents)

### 5. Standards supportés : MCP + OpenAPI + GraphQL

Salesforce indique que sa plateforme expose simultanément MCP, OpenAPI et GraphQL. **C'est exactement le pont sur lequel SLICE est posé : OpenAPI → MCP.** Salesforce confirme officiellement qu'OpenAPI reste la spec source de vérité côté backend, et que MCP est la projection agent-native par-dessus.

- Source : [Salesforce Headless 360 Complete Guide — Codleo](https://www.codleo.com/blog/salesforce-headless-360-complete-guide)

---

## Convergences réelles avec SLICE

Listées en ordre décroissant de solidité. Tout ce qui n'est pas dans cette section est volontairement exclu.

### Convergence 1 — Validation de la thèse marché (forte)
Un éditeur SaaS de premier plan investit massivement dans MCP comme couche d'accès agents. Cela **dérisque le pari fondateur de SLICE** : "MCP est le standard d'accès des agents IA aux API". Argument à reprendre dans tout pitch SLICE.

### Convergence 2 — OpenAPI comme source de vérité (forte)
Salesforce confirme officiellement le triplet API REST + OpenAPI + MCP. **Le workflow exact de SLICE (OpenAPI → MCP) est validé par le plus gros acteur CRM du marché.** Ce n'est plus un pari technique, c'est un pattern industriel.

### Convergence 3 — Pattern de curation des endpoints (moyenne)
Le Data 360 MCP Server consolide 200 opérations derrière 3 façades. C'est une réponse au problème de **context window des LLMs** quand on expose trop d'outils. SLICE adresse le même problème en amont via **sélection manuelle d'endpoints** (l'écran 2 de SLICE).

Ce n'est pas la même technique (façade dynamique vs curation manuelle), mais c'est **le même problème adressé**. Ça renforce la légitimité de l'écran de sélection SLICE — la curation n'est pas un nice-to-have, c'est central.

### Convergence 4 — AgentExchange comme canal indirect (faible mais réelle)
Des éditeurs partenaires de Salesforce (et plus largement, tous les ISV de l'écosystème Slack/Salesforce) peuvent vouloir publier un MCP server sur AgentExchange **sans avoir la compétence interne pour le coder**. SLICE pourrait être un outil de production rapide pour ces éditeurs — à condition qu'ils acceptent un MCP généré et que SLICE supporte OAuth (V1.5).

À ce stade c'est une **hypothèse à valider**, pas une convergence acquise.

### Convergence 5 — Vocabulaire "agent-first" partagé (faible)
Salesforce parle de "No Browser Required" et d'agents qui exécutent des process sans interface. SLICE parle de générer des MCP pour des agents cloud (n8n, Airia). C'est le même langage produit, ce qui simplifie le marketing SLICE : pas besoin d'évangéliser le concept, Salesforce le fait pour le marché.

---

## Non-convergences à assumer (anti-fausses-pistes)

À garder en tête pour ne pas se faire piéger par une fausse synergie :

1. **SLICE n'a aucune valeur pour la plateforme Salesforce elle-même** — Salesforce livre déjà ses propres MCP servers, hébergés et maintenus officiellement. Tenter de positionner SLICE comme "générez votre MCP Salesforce" serait un combat perdu d'avance.
2. **Public cible différent** — Salesforce parle aux devs/admins SF. SLICE parle aux ops/founders non-tech. Aucune cannibalisation, mais aucun co-go-to-market évident non plus.
3. **OAuth bloque toute intégration Salesforce-comme-source** — Même si un utilisateur SLICE voulait générer un MCP pour une API Salesforce REST, il ne pourra pas en MVP (OAuth2 = V1.5).
4. **Salesforce a un budget marketing infini, SLICE non** — Le discours "MCP = futur" sera porté par Salesforce, OpenAI, Anthropic. SLICE doit se positionner comme outil **pour les API qui ne sont PAS dans cette short list d'éditeurs majeurs** : APIs internes, APIs SaaS mid-market, APIs verticales.

---

## Recommandations actionnables pour SLICE

1. **Reprendre l'annonce Headless 360 dans le pitch SLICE** comme preuve de marché. Une slide "Salesforce a investi 25 ans de produit pour devenir headless via MCP — votre API mérite la même chose". Pas besoin d'inventer, citer.
2. **Positionner clairement SLICE hors écosystème Salesforce** : SLICE est pour les **APIs longue traîne** (SaaS mid-market, APIs internes, APIs verticales) — exactement là où il n'y aura jamais de MCP server officiel financé par l'éditeur.
3. **Confirmer OAuth2 en V1.5** comme priorité bloquante. Sans OAuth2, SLICE est exclu de tout l'écosystème enterprise (Salesforce, Microsoft 365, Google Workspace, Notion). C'est *la* feature qui débloque le mid-market.
4. **Étudier le pattern de façade du Data 360 MCP Server** comme évolution post-MVP. Quand un utilisateur SLICE sélectionne 80+ endpoints, proposer automatiquement un mode "façade" (3 outils search/examples/execute) plutôt que 80 outils plats. C'est un différenciateur produit potentiel sur Speakeasy/Stainless.
5. **Surveiller AgentExchange** comme canal de distribution potentiel post-V1.5. Si Salesforce ouvre AgentExchange aux MCP servers tiers indépendants d'apps SF, SLICE peut y publier les MCP générés par ses utilisateurs.
6. **Ne pas inventer de partenariat ou de complémentarité technique avec Salesforce dans la communication produit.** Il n'y en a pas à ce stade. Affirmer le contraire affaiblirait la crédibilité de SLICE auprès d'interlocuteurs qui connaissent Headless 360.

---

## Sources

1. [Salesforce — Introducing Salesforce Headless 360 (annonce officielle)](https://www.salesforce.com/news/stories/salesforce-headless-360-announcement/)
2. [Salesforce Developers — Introducing the Data 360 MCP Server (Developer Preview)](https://developer.salesforce.com/blogs/2026/05/introducing-the-data-360-mcp-server-developer-preview)
3. [VentureBeat — Salesforce launches Headless 360 to turn its entire platform into infrastructure for AI agents](https://venturebeat.com/technology/salesforce-launches-headless-360-to-turn-its-entire-platform-into-infrastructure-for-ai-agents)
4. [SalesforceDevops.net — TDX 2026 Reporter's Notebook: Salesforce Goes Headless](https://salesforcedevops.net/index.php/2026/04/15/tdx-2026-reporters-notebook-salesforce-goes-headless-and-widens-the-builder-gap/)
5. [Cirra — Salesforce Headless 360 and the MCP Standard Explained](https://cirra.ai/articles/salesforce-headless-360-mcp-standard)
6. [Codleo — Salesforce Headless 360: Complete 2026 Guide (API + MCP)](https://www.codleo.com/blog/salesforce-headless-360-complete-guide)
7. [Apex Hours — Salesforce Headless 360: No Browser Required](https://www.apexhours.com/salesforce-headless-360-no-browser-required-the-entire-platform-is-now-an-api/)
8. [CIO — Salesforce launches Headless 360 to support agent-first enterprise workflows](https://www.cio.com/article/4159536/salesforce-launches-headless-360-to-support-agent-first-enterprise-workflows.html)
9. [Diginomica — TDX 2026: why Headless 360 is really about operating model transformation](https://diginomica.com/salesforce-tdx-2026-why-salesforces-headless-360-announcement-tdx-really-about-operating-model)
10. [Salesforce Ben — Headless 360 and Agentforce Vibes 2.0 Revealed at TDX 2026](https://www.salesforceben.com/salesforce-headless-360-and-agentforce-vibes-2-0-revealed-at-tdx-2026/)
