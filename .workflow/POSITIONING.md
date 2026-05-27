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

## À ré-examiner

- [ ] Quand un trafic réel arrive, mesurer le profil des utilisateurs (devs vs non-devs) pour valider l'hypothèse de segment
- [ ] Surveiller Speakeasy tous les 3 mois : sortie d'une UI web grand public = signal d'alerte
- [ ] Si Anthropic ressort Stainless en consumer, ré-évaluer (concurrent avec leur distribution = jeu changé)
