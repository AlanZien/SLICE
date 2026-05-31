# Review — Phase Pivot-3 : Mode relai d'auth (mergée PR #18)

## Ce qui a bien fonctionné
- **De-risk en spike TDD** avant de toucher les templates : un test in-process (~1s) a prouvé que `AsyncLocalStorage` traverse le SDK MCP (OQ-3) → plan B écarté sans coût. Spike promu en test de régression permanent.
- **E2E runtime du code généré via `tsx`** (sans build tsc) : on lance un vrai MCP en mode relai contre un upstream mocké → garantie de bout en bout (RC2.6/2.4/2.7).
- L'audit sécurité a **trouvé et fait corriger un vrai défaut** (injection CRLF). C'est la valeur du niveau CRITIQUE.
- 384 tests verts, typecheck strict clean, bundle généré compile (tsc smoke).

## Ce qui a été difficile
- L'**inconnu technique** (threading du header à travers la lib) a demandé un spike — bien anticipé par la SPEC (OQ-3).
- Le test E2E a **révélé une limite pré-existante** : le serveur généré ne gère qu'une session à la fois (transport partagé) → a forcé un spawn par scénario, et surtout signale un blocage pour le multi-agents.
- Pédagogie : plusieurs allers-retours pour expliquer le concept de relai en langage non technique (où vit la clé, qui la saisit).

## Décisions prises en cours de route
- **Switch runtime** `MCP_AUTH_MODE` (pas de génération conditionnelle) → un seul bundle sert self-host et cloud.
- En `relay`, **aucun contrôle d'accès descendant** : reposé sur l'URL non-devinable (RC4.4) → exigence infra reportée à Pivot-4.
- Token relayé restreint à l'**ASCII imprimable** (anti-CRLF) suite au security-review.

## Findings EVALUATE et traitement
- CRITIQUE : security-review + revue qualité inline. 1 finding MEDIUM **corrigé** (regex token). 2 findings **importants reportés à Pivot-4** : multi-session (transport par session) + contrôle d'accès relay (URL haute entropie, 404 uniforme, pas de log d'URL).

## Commentaires reviewers
- Aucun (PR auto-mergée, projet solo).
