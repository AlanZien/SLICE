# Plan : Phase 11 — Exécutable standalone cross-OS (Mac + Windows)

Date : 2026-05-29
Statut : DRAFT — en attente validation utilisateur

## Pourquoi cette phase

Le ZIP de code source actuel oblige l'utilisateur à ouvrir un terminal, installer pnpm, exécuter `pnpm install` puis `pnpm build`. C'est incompatible avec la cible "un peu tech" du PRD (R0 — vocabulaire humain, 3 étapes max).

Objectif : remplacer le ZIP source par **un fichier exécutable unique** (Mac et Windows), prêt à lancer sans aucune commande terminal, aucune dépendance externe.

## Cible utilisateur après cette phase

L'utilisateur télécharge un fichier (~50 Mo) selon son OS. Il double-clique. C'est lancé. Plus de Node.js, plus de pnpm, plus de build.

## Fichiers impactés (~6 nouveaux + 3 modifiés)

### Nouveaux côté serveur SLICE
- [ ] `src/server/services/binary-builder.ts` — orchestre `Bun build --compile` avec target Mac/Windows
- [ ] `src/server/services/binary-builder.test.ts` — tests unitaires + snapshot binaire
- [ ] `src/server/routes/generate-binary.ts` — endpoint `POST /api/generate-binary?target=mac|windows`
- [ ] `src/server/routes/generate-binary.test.ts`
- [ ] `src/shared/types.ts` — ajout `BinaryTarget = 'macos-arm64' | 'macos-x64' | 'windows-x64'`
- [ ] `docs/binary-pipeline.md` — documentation interne du pipeline

### Modifiés côté serveur SLICE
- [ ] `src/server/app.ts` — wire nouvelle route
- [ ] `src/server/templates/index.ts.hbs` — entrypoint modifié pour fonctionner en binaire (différences mineures avec Bun)
- [ ] `package.json` — devDep `bun` (binaire Bun installé côté CI/serveur SLICE)

### Modifiés côté client SLICE
- [ ] `src/client/screens/success.tsx` — remplace "Télécharger ZIP" par 2 boutons "Télécharger pour Mac / Windows" + détection auto OS
- [ ] `src/client/lib/api.ts` — `apiGenerateBinary(req, target)`
- [ ] `src/client/lib/os-detection.ts` — détecte Mac/Windows depuis user-agent

## Pré-requis techniques

- **Bun ≥ 1.1.20** doit être installé sur le serveur SLICE (production + dev). Bun supporte la cross-compilation native via `--target=bun-darwin-arm64`, `--target=bun-darwin-x64`, `--target=bun-windows-x64`.
- Le serveur SLICE doit avoir suffisamment de RAM pour héberger Bun en mémoire (~200 Mo par compilation).
- Architecture serveur SLICE actuelle (Node.js) reste inchangée — Bun est invoqué comme sous-processus.

## Tâches détaillées

### Étape A — Pipeline de compilation

- [ ] 1. Vérifier que Bun est installable sur la plateforme cible (test en local d'abord, puis pré-requis pour le déploiement futur)
- [ ] 2. Implémenter `binary-builder.buildBinary(files, target): Promise<Buffer>` :
  - Crée un dossier temporaire
  - Écrit les fichiers source du MCP (mêmes que la phase 07)
  - Lance `bun install --production` (5-10s)
  - Lance `bun build src/index.ts --compile --target=<target> --outfile=mcp` (3-5s)
  - Lit le binaire produit en Buffer
  - Nettoie le dossier temporaire (R1.4.6 — pas de persistance)
- [ ] 3. Gérer les 3 targets : `bun-darwin-arm64` (Mac Apple Silicon), `bun-darwin-x64` (Mac Intel), `bun-windows-x64`
- [ ] 4. Timeout strict 30s sur la compilation (sinon échec propre)
- [ ] 5. Gestion d'erreur : si Bun n'est pas installé, message clair côté serveur logs

### Étape B — Endpoint HTTP

- [ ] 6. `POST /api/generate-binary?target=<target>` :
  - Body : `GenerateRequest` (identique à `/api/generate` actuel)
  - Validation Zod identique
  - Re-parse spec serveur identique
  - Appelle `binary-builder.buildBinary(files, target)`
  - Stream le binaire en réponse avec :
    - `Content-Type: application/octet-stream`
    - `Content-Disposition: attachment; filename="<mcpName>-<target>.<ext>"` (extension `.exe` pour Windows, aucune pour Mac)
- [ ] 7. Le timeout de la route passe à 60s (30s timeout interne + marge)
- [ ] 8. L'endpoint `/api/generate` (ZIP source) reste disponible — on ne le supprime pas, mais on n'en parle plus dans l'UI

### Étape C — Mise à jour du template `index.ts`

- [ ] 9. Vérifier que le template `index.ts.hbs` fonctionne correctement compilé par Bun :
  - Bun gère nativement `import 'dotenv/config'` mais lit aussi `.env` automatiquement → confirmer ou ajuster
  - Bun gère TypeScript directement → pas besoin de `tsc` séparé
  - Le binaire compilé n'a plus besoin de `node_modules` à côté de lui

### Étape D — Mise à jour de l'écran de succès

- [ ] 10. Détecter l'OS du visiteur depuis le user-agent (`navigator.platform` ou `navigator.userAgent`)
- [ ] 11. Bouton principal : "Télécharger pour <OS détecté>" (gros, mis en avant)
- [ ] 12. Bouton secondaire : "Télécharger pour l'autre OS" (plus discret)
- [ ] 13. Indication de taille : "~50 Mo"
- [ ] 14. Supprimer les 3 étapes "Unzip / pnpm install / pnpm build" du récap. Elles sont remplacées par "Double-clique sur le fichier téléchargé"
- [ ] 15. Conserver les onglets de connexion (Claude Desktop / n8n / Airia) — la phase 15 modifiera Claude Desktop pour pointer vers le binaire au lieu de `node dist/index.js`

## Tests TDD

- [ ] `binary-builder.buildBinary(files, 'bun-darwin-arm64')` retourne un Buffer non vide et le premier byte est un magic header Mach-O — `binary-builder.test.ts`
- [ ] `binary-builder.buildBinary(files, 'bun-windows-x64')` retourne un Buffer dont le header est `MZ` (PE Windows) — idem
- [ ] `binary-builder` nettoie son dossier temporaire même en cas d'échec (vérification `os.tmpdir()` before/after)
- [ ] `binary-builder` rejette avec un timeout si Bun met > 30s
- [ ] `POST /api/generate-binary?target=bun-darwin-arm64` retourne 200 + Content-Disposition correct — `generate-binary.test.ts`
- [ ] `POST /api/generate-binary?target=invalid` retourne 400 — idem
- [ ] L'endpoint partage la même validation Zod que `/api/generate` (factorisation) — test de régression
- [ ] **Smoke fonctionnel** : binaire Mac généré est lancé localement (test E2E intégré au snapshot), envoyé un JSON-RPC `initialize`, vérifié la réponse en < 5s
- [ ] **Perf** : génération binaire < 15s p95 sur fixture petstore (petit), < 25s sur fixture shopify-50

## UAT

- L'utilisateur sur Mac télécharge le binaire `notion-mcp-mac`, double-clique, voit une fenêtre Terminal s'ouvrir avec le serveur MCP en attente (la phase 15 ajoutera une UI au-dessus)
- L'utilisateur sur Windows télécharge `notion-mcp-windows.exe`, double-clique, voit une fenêtre cmd.exe avec le serveur MCP en attente
- Code-signing macOS (Gatekeeper) : à noter — le premier lancement nécessitera un clic-droit → Ouvrir. Une note explicative sur l'écran de succès doit prévenir.

## Documentation

- [ ] `docs/binary-pipeline.md` — explique le pipeline Bun, les targets, les gotchas Gatekeeper
- [ ] Section README mise à jour : décrire le nouveau format de livraison
- [ ] Ajouter dans le PRD une note R1.4.X "Le livrable est un binaire OS-spécifique" — modifier R1.4.8 (qui mentionnait "MCP fonctionne sans modification") pour préciser que c'est un binaire prêt à exécuter

## Definition of Done

- [ ] Tests TDD passent
- [ ] Smoke fonctionnel : binaire Mac généré tourne sur la machine de dev, répond au handshake MCP
- [ ] Binaire Windows généré et inspecté (header PE valide) — exécution complète sur Windows reporté à un UAT manuel utilisateur
- [ ] Perf < 25s p95
- [ ] Aucune régression sur `/api/generate` (ZIP source toujours fonctionnel pour compat)
- [ ] Écran de succès SLICE affiche les 2 boutons de téléchargement
- [ ] /review sans problème bloquant
- [ ] Commit + PR
