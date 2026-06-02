# REVIEW — Chantier OAuth amont (client_credentials) — PR #30, #32, #33, #34

Mergé 2026-06-02. SPEC : `.workflow/SPEC-OAUTH-UPSTREAM.md`. Décision : `DECISIONS.md` D005.

## Objectif & résultat

SLICE rejetait ~1/5 des API réelles en `UNSUPPORTED_AUTH` (OAuth2) — le plus gros levier de couverture. Le chantier ajoute le support OAuth2 :
- **Acceptation** de toutes les specs oauth2/OIDC (1a).
- **Flow client_credentials complet** dans le kit self-host : obtention/cache/refresh/retry du token (1b).
- **Relai** côté runtime hébergé (1c).
- **Affichage** config + mesure (1d).

**Mesure** : `corpus:check 60` → 0 rejet OAuth (Stripe & co passent). Objectif atteint.

## Découpage en 4 sous-phases — a très bien fonctionné

L'advisor (en SPEC) a cassé une phase ~12 fichiers en 4 sous-phases ordonnées par dépendance (1a backend → 1b codegen → 1c hébergé → 1d UI). Chaque sous-phase = une PR verte isolée, mergée indépendamment. Bénéfice : la partie risquée (1b) était petite et focalisée ; les points d'arrêt étaient nets. À refaire pour tout chantier > 5 fichiers.

## Ce qui a bien fonctionné

- **ORIENT sans spike (D005)** : en lisant le banc relai existant, la stratégie de test de 1b s'est tranchée par analyse (le pattern double-mock est dérivable ; le piège mono-session impose de tester la concurrence sur le module isolé). La demi-journée de spike annoncée a été économisée — l'analyse du code existant suffisait.
- **EVALUATE CRITIQUE a payé** : la security-review a trouvé **2 RCE HIGH** (1b) invisibles à 487 tests verts — `tokenUrl`/`scopes` d'une spec hostile interpolés dans des string-literals JS du code généré → injection de code dans le kit téléchargé. Corrigé en double défense (JSON-encodage au point de génération + rejet Zod) + tests de régression. C'est la justification même du classement CRITIQUE sur les chemins auth/codegen.
- **Le banc runtime `tsx` + double-mock** (token + upstream) a rendu testable un flow complexe (cache/refresh/retry/concurrence) sans build, en réutilisant le pattern de `mcp-generator.relay.test.ts`.

## Ce qui a été difficile / appris

- **Piège mono-session (réapparu, 1b)** : tester le cache de token via 2 sessions sur le même process → `Server already initialized`. Résolu en testant 2 appels dans **une** session (cache) et la concurrence sur le **module isolé**. D005 l'avait anticipé.
- **Vite bloque les imports hors racine projet** : le module généré (dans `/tmp`) ne s'importe pas ; copié dans un dossier projet gitignored (`.tmp-oauth-mod/`) pour le test R14.
- **Erreur process (1d)** : j'ai d'abord commité sur `main` local (oubli de branche). Corrigé via `git branch feature/... && git branch -f main origin/main` (jamais de push main, jamais de reset --hard).
- **Auth descendante vs amont** : en mode env/HTTP, le kit exige `MCP_SERVER_TOKEN` (agent→MCP) en plus du flow OAuth (MCP→API). Le banc de test a dû fournir les deux. Distinction à garder en tête.

## Findings « à considérer » (EVALUATE)

- **Infra de test dupliquée** : `mcp-generator.oauth.test.ts` recoupe `mcp-generator.relay.test.ts` (freePort, startServer, mock servers, callTool). Factorisable en helper partagé → BACKLOG (refactor cross-fichier, non bloquant).
- **Échappement maison dans le codegen** : `mcp-generator.ts` échappe la description des tools via `.replace(/'/g, "\\'")` (ligne ~115) — même classe de risque que les 2 RCE corrigées, mais traité par escape manuel au lieu de JSON.stringify. À auditer → BACKLOG.

## Patterns récurrents détectés (seuil 3)

**Interpolation de données externes dans le code généré = surface d'injection.** Occurrences : (1) clés de params via `JSON.stringify` (`formatPropertyKey`, déjà OK), (2) description des tools via escape manuel `.replace` (fragile), (3) tokenUrl/scopes — les 2 RCE de ce chantier. ≥3 occurrences → **promu en règle** dans `01-conventions.md` : toute donnée d'origine externe injectée dans du code généré doit être encodée via `JSON.stringify`, jamais interpolée brute ni échappée à la main.
