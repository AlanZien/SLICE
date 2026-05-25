# Plan : Phase 10 — Écran de succès + snippets de connexion

Date : 2026-05-25
SPEC : .workflow/SPEC.md (section 1.5, écran 2.5)
Statut : DRAFT

## Objectif

Implémenter l'écran 4 : confirmation animée, récap (nom MCP + endpoints + % économisé snapshot), 3 étapes pour utiliser, onglets snippets de connexion (Claude Desktop / n8n / Airia) avec bouton "Copier", CTAs de navigation.

## Fichiers impactes

- [ ] `src/client/screens/success.tsx` — écran 4 complet
- [ ] `src/client/components/check-anim.tsx` — SVG check avec stroke-dasharray draw 600ms, respecte prefers-reduced-motion
- [ ] `src/client/components/connection-tabs.tsx` — tabs Claude Desktop / n8n / Airia
- [ ] `src/client/components/code-snippet.tsx` — bloc code + bouton "Copier" + toast
- [ ] `src/client/components/toast.tsx` — toast utility (top-right, slide-in, auto-dismiss)
- [ ] `src/client/lib/snippets.ts` — génération des snippets selon config (nom MCP, mode, auth)
- [ ] `src/client/App.tsx` — branche écran 4 après génération réussie + garde mémoire du ZIP blob pour re-download
- [ ] `src/client/hooks/use-download.ts` — gère le download et le re-download du blob

## Taches

- [ ] 1. Implémenter `<CheckAnim>` : SVG path check, animation `stroke-dasharray` 600ms ease, classe `motion-safe:animate-draw`. Pour `prefers-reduced-motion`, affichage direct sans anim.
- [ ] 2. Implémenter `<Toast>` réutilisable : variants `success` / `error`, slide-in 200ms, auto-dismiss 4s succès / 6s erreur, ARIA `role=status` / `role=alert`. Provider global via context.
- [ ] 3. Implémenter `<CodeSnippet>` : `<pre><code>` avec coloration syntaxique légère (couleurs SPEC 2.1 tok-*), bouton "Copier" qui appelle `navigator.clipboard.writeText` puis déclenche un toast "Copié ✓". Pendant 1.5s, le bouton affiche "Copié".
- [ ] 4. Implémenter `snippets.ts` :
  - `buildClaudeDesktopSnippet(config)` → JSON `{"mcpServers": {[name]: {command: "node", args: ["/path/dist/index.js"], env: {...}}}}` avec placeholders
  - `buildN8nSnippet(config)` → URL HTTP + Bearer token (placeholder URL)
  - `buildAiriaSnippet(config)` → format Airia spécifique (à documenter en GENERATE selon doc Airia officielle)
- [ ] 5. Implémenter `<ConnectionTabs>` : 3 tabs, désactivation selon `config.mode` (R1.5.8/1.5.9/1.5.10), tab par défaut selon mode (stdio→Claude, http→n8n, both→Claude). Navigation flèches G/D, ARIA `role=tablist`.
- [ ] 6. Implémenter `useDownload()` : reçoit le Blob ZIP issu de `apiGenerate()` (phase 08), déclenche le download initial automatiquement, expose `redownload()` qui réutilise le blob en mémoire.
- [ ] 7. Implémenter `screens/success.tsx` :
  - `<CheckAnim>` en haut centré
  - H1 Fraunces italic "Ton MCP est prêt"
  - Récap : `<mcpName> · <N> endpoints exposés · <X>% de contexte gagné` (X = snapshot de l'écran 2 au moment du clic Générer, R1.5.6)
  - 3 étapes numérotées (Fraunces italic pour les numéros)
  - `<ConnectionTabs>` avec snippets
  - CTAs : "Générer un autre MCP" (→ reset écran 1), "Revenir à la sélection" (→ écran 2 état préservé)
- [ ] 8. Modifier `App.tsx` :
  - Après clic "Générer" écran 3 : POST `/api/generate` → reçoit blob → state `{ zipBlob, mcpName, economySnapshot }` → écran 4
  - Snapshot du % d'économie pris au moment du clic, transmis tel quel à l'écran 4 (R1.5.6)

## Tests TDD

- [ ] `<CheckAnim>` ne joue pas l'anim si `prefers-reduced-motion: reduce` (test via matchMedia mock) — `check-anim.test.tsx`
- [ ] `<Toast>` auto-dismiss après 4s pour success — `toast.test.tsx`
- [ ] `<Toast>` annonce via `role=alert` pour error — idem
- [ ] `<CodeSnippet>` copie le contenu dans clipboard au click — `code-snippet.test.tsx`
- [ ] `<CodeSnippet>` affiche "Copié" pendant 1.5s — idem
- [ ] `snippets.buildClaudeDesktopSnippet(config)` retourne un JSON valide avec les bonnes valeurs — `snippets.test.ts`
- [ ] `snippets.buildN8nSnippet(config)` inclut le MCP_SERVER_TOKEN si présent — idem
- [ ] `<ConnectionTabs>` désactive l'onglet Claude si mode==http — `connection-tabs.test.tsx`
- [ ] `<ConnectionTabs>` désactive les onglets n8n/Airia si mode==stdio — idem
- [ ] `<ConnectionTabs>` navigation au clavier (flèches G/D) — idem
- [ ] `useDownload` redownload réutilise le blob (pas de re-fetch) — `use-download.test.ts`
- [ ] `screens/success` affiche le snapshot d'économie identique à celui de l'écran 2 — `success.test.tsx`

## Tests E2E

- [ ] Parcours complet upload→sélection→config→génération→succès, click "Copier Claude Desktop" → contenu copié validé via `navigator.clipboard.readText` (mock)

## UAT

- Génération réussie → animation check joue, "Ton MCP est prêt" affiché, récap visible.
- Onglet "Claude Desktop" actif par défaut (mode "Les deux"), snippet visible, "Copier" → toast "Copié ✓".
- Mode "Sur mon ordi" → onglets n8n/Airia grisés avec tooltip "Disponible si tu choisis le mode HTTP".
- Click "Générer un autre MCP" → retour écran 1 propre.
- Click "Revenir à la sélection" → écran 2 avec la sélection préservée.

## Documentation

- [ ] Vérifier que les snippets générés correspondent à la doc officielle de Claude Desktop, n8n, Airia (à valider lors de la phase)

## Definition of Done

- [ ] Tests TDD passent
- [ ] UAT : connexion réussie d'un MCP généré dans Claude Desktop via snippet copié
- [ ] Animation respecte prefers-reduced-motion
- [ ] /review sans problème critique
- [ ] Commit + PR
