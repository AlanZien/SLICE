# Matrice de couverture SPEC → PLAN

Date : 2026-05-25 (rev après critique advisor + splits)
Source : `.workflow/SPEC.md`

Cette matrice vérifie que **chaque règle Rx.y.z de la SPEC est traitée par au moins une tâche dans au moins un PLAN.md** ET qu'elle a au moins un test TDD. Étape obligatoire de REFINE (cf. `.claude/rules/phases/05-refine.md` §3).

## Structure finale des phases (13 phases après split)

| #  | Phase                                  | Durée  | Statut split  |
|----|----------------------------------------|--------|---------------|
| 01 | Squelette back + front + theming       | 1.5 j  | identique     |
| 02 | Upload & parsing OpenAPI 3.x           | 2 j    | identique     |
| 03 | Conversion Swagger 2.0 & Postman v2    | 0.5 j  | identique     |
| 04 | Écran 2 — sélection endpoints          | 2 j    | identique     |
| 05 | Calibrage tokens + compteur économie   | 1 j    | identique     |
| 06 | Écran 3 — configuration                | 1.5 j  | identique     |
| 07 | Templates Handlebars + générateur      | 1.5 j  | **split 07a** |
| 08 | API /api/generate + ZIP streaming      | 1 j    | **split 07b** |
| 09 | Test E2E "MCP fonctionne sans modif"   | 0.5 j  | **split 07c** |
| 10 | Écran 4 — succès + snippets            | 0.5 j  | renuméroté    |
| 11 | Sécurité backend (helmet, CORS, rate)  | 1 j    | **split 09a** |
| 12 | Accessibilité + Responsive             | 1 j    | **split 09b** |
| 13 | Polish UX + documentation finale       | 0.5 j  | **split 09c** |
| **Total estimé** | | **~14 j** | |

Note : le total dépasse l'estimation PRD (7-9 j) car les splits 07 et 09 sont plus rigoureux. Cible révisée : **12-14 jours** (avec marge pour calibrage tokens et E2E).

## Couverture des règles métier

| Règle | Description courte | Phase | Tâche / Test principal |
|-------|--------------------|-------|------------------------|
| R1.1.1 | Formats acceptés .json/.yaml/.yml | 02 | T6 (multer), test 415 |
| R1.1.2 | Max 10 Mo, 413 | 02 | T6 (multer limit), test 413 |
| R1.1.3 | OpenAPI 3.x + Swagger 2.0 + Postman v2 (conversion auto) | 03 | T1–T6, fixtures |
| R1.1.4 | Parsing safe (no $ref externes, YAML safe) | 02 | T4 (parser.ts) |
| R1.1.5 | Timeout parsing 5s | 02 | T4, test PARSE_TIMEOUT |
| R1.1.6 | Profondeur max 20 | 02 | T4, test PARSE_DEPTH_EXCEEDED (fixture deep-25) |
| R1.1.7 | ≥ 1 endpoint requis | 02 | T4, test EMPTY_SPEC |
| R1.1.8 | Pas de persistance spec | 02 + 11 | Test "no persistence post-upload" (phase 11) |
| R1.1.9 | < 2s p95 sur 50 endpoints | 02 | Test perf `parser.perf.test.ts` |
| R1.1.10 | Rate limit 30/min/IP upload | 11 | T5 (rate-limit middleware) |
| R1.2.1 | Endpoint = checkbox + label + method + tooltip path | 04 | T3 (EndpointRow) |
| R1.2.2 | Libellé humain (summary > description > généré) | 02 | T5 (spec-normalizer) |
| R1.2.3 | Groupement par tag, fallback "Autres" | 02 | T5 |
| R1.2.4 | Accordéon ouvert par défaut | 04 | T4 (EndpointGroup) |
| R1.2.5 | Recherche client < 100ms p95 sur 500 endpoints | 04 | T5, test perf fixture aws-500 |
| R1.2.6 | Actions bulk | 04 | T1, T6 |
| R1.2.7 | GET pré-cochés par défaut | 04 | T1 (useSelection init) |
| R1.2.8 | Compteur calibré ±15% via tiktoken | 05 | T3 (calibrage), T5 (formule), tests |
| R1.2.9 | Bouton Continuer désactivé si 0 sélectionné | 04 | T7 |
| R1.2.10 | ≥ 1 endpoint requis pour passer à écran 3 | 04 | T7 |
| R1.3.1 | Auto-détection nom MCP + URL + auth + fallbacks slug | 06 | T1–T4 |
| R1.3.2 | Choix mode obligatoire (3 cards) | 06 | T8, T10 |
| R1.3.3 | Options avancées repliables | 06 | T9 |
| R1.3.4 | Bouton Générer désactivé si mode==null | 06 | T10 |
| R1.3.5 | Validation champs onBlur | 06 | T6 |
| R1.4.1 | POST /api/generate, body 15 Mo max | 08 | T5 (body limit) |
| R1.4.1bis | Re-validation parsedSpec serveur | 08 | T4 (re-parse) |
| R1.4.1ter | Whitelist selectedIds | 08 | T4 |
| R1.4.2 | Génération synchrone, ZIP stream | 08 | T4 (handler), T2 (zip-builder) |
| R1.4.3 | In-memory streaming | 08 | T2 + test "no tmp writes" |
| R1.4.4 | < 5s p95 sur 50 endpoints, < 10s sur 200, hard 30s | 08 | Tests perf `generate.perf.test.ts` |
| R1.4.5 | Rate limit 30/min/IP generate | 11 | T5 |
| R1.4.6 | Pas de stockage post-génération | 08 | Test "no persistence" assertion tmpdir |
| R1.4.7 | Contenu ZIP : 8 fichiers attendus | 07 | T4–T10 (templates), T10 (mcp-generator) |
| R1.4.8 | Code généré fonctionne sans modif, handshake < 3s | 09 | T1–T2 (test E2E intégral) |
| R1.4.9 | Validation Zod côté MCP runtime | 07 | T3 (zod-schema-builder), template tools.ts.hbs |
| R1.5.1 | Bouton "Télécharger à nouveau" (blob réutilisé) | 10 | T6 (useDownload) |
| R1.5.2 | 3 étapes affichées | 10 | T7 |
| R1.5.3 | Snippet Claude Desktop + copier | 10 | T4, T3 |
| R1.5.4 | Snippet n8n | 10 | T4 |
| R1.5.5 | Snippet Airia | 10 | T4 |
| R1.5.6 | Snapshot strict du compteur écran 2 → écran 4 | 10 | T8 (state), test |
| R1.5.7 | CTAs "Générer un autre" / "Revenir à la sélection" | 10 | T7 |
| R1.5.8 | Mode stdio → onglet Claude actif | 10 | T5 |
| R1.5.9 | Mode HTTP → onglet n8n actif | 10 | T5 |
| R1.5.10 | Mode both → tous actifs, Claude par défaut | 10 | T5 |
| R1.6.1 | /api/upload multipart unique field | 02 | T6 |
| R1.6.2 | /api/generate whitelist config | 08 | T3 (validation Zod) |
| R1.6.3 | Headers sécurité (helmet) | 11 | T2 |
| R1.6.4 | CORS origin contrôlé | 11 | T3 |
| R1.6.5 | Logs sans body | 11 | T6 (logger) |
| R1.6.6 | Rate limit 429 | 11 | T5 |
| R1.6.7 | Pas d'eval / new Function + grep CI | 11 | T8 (grep CI + test shell) |
| R1.6.8 | Body limit 15 Mo /api/generate | 08 (posé) + 11 (vérifié) | Phase 08 T5, phase 11 T4 |
| R1.6.9 | Upload multipart unique fichier | 02 | T6 |

## Vérification

- **Total règles SPEC** : 55 règles métier.
- **Règles couvertes par une tâche** : 55 / 55.
- **Règles couvertes par un test TDD** : 55 / 55 (perf R1.1.9 + R1.4.4 ajoutées, "no persistence" R1.1.8 + R1.4.6 ajoutées en phase 11/08).
- **Règles orphelines** : 0.

## Couverture des éléments visuels (SPEC §2)

| Élément SPEC | Phase | Composant / Tâche |
|--------------|-------|-------------------|
| Tokens design §2.1 | 01 | T6 |
| Écran 1 §2.2 + états | 02 | T7–T8 |
| Écran 2 §2.3 + états | 04 (logique) + 05 (compteur) + 12 (responsive) | Multiples |
| Écran 3 §2.4 + états | 06 (logique) + 12 (responsive) | Multiples |
| Écran 4 §2.5 + états | 10 (logique) + 12 (responsive) | Multiples |
| Composants transverses §2.6 (Toast, Tooltip, Skeleton) | 02 (Tooltip), 10 (Toast), 13 (Skeleton + ErrorBoundary) | Multi-phases |

## Couverture des parcours §3

- Parcours nominal §3.1 : couvert par tests E2E phases 02→08→09→10
- Parcours erreur spec §3.2 : couvert phase 02 + 03
- Navigation arrière §3.3 : couvert phases 06 (retour sélection), 10 (CTAs), 13 (ErrorBoundary)
- Raccourcis clavier §3.4 : couvert phases 04 (⌘K), 12 (audit clavier complet)

---

**Conclusion :** couverture complète après corrections advisor. 55/55 règles avec tâche + test TDD. 13 phases atomiques (≤ 2 jours, ≤ 5 fichiers logiques chacune). Prêt pour validation utilisateur.
