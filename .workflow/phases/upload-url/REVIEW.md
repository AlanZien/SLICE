# REVIEW — Phase upload-url (2026-06-06, PR #38)

## Ce qui a bien fonctionné

- **TDD propre sur la sécurité** : le SSRF guard (assertPublicUrl + redirect chain) a été testé en isolation avec des mocks DNS — aucun appel réseau réel dans les tests.
- **Découverte proactive du bug rawSpec** : EVALUATE (angle altitude) a détecté que `JSON.stringify(ParsedSpec)` comme rawSpec aurait cassé silencieusement la génération. Le bug n'aurait jamais surfacé en test unitaire (les tests de generate mockent parseSpecIsolated).
- **Centralisation SSRF dans fetchWithRedirects** : le check SSRF était dupliqué (fetchSpecFromUrl + chaque redirect). Refactoriser pour couvrir tous les hops depuis fetchWithRedirects rend l'invariant de sécurité impossible à contourner.

## Ce qui a été difficile

- **Mocks DNS dans les tests** : assertPublicUrl fait de vrais lookups DNS. Il a fallu mocker `./ssrf-guard` via `vi.mock` avec import dynamique pour éviter les échecs aléatoires en réseau.
- **Adapter le test client après changement de contrat** : le mock `mockFetchOnce({ body: VALID_PARSED })` renvoyait `ParsedSpec` directement ; après passage à `{ parsed, raw }`, le test a échoué — ajustement nécessaire.

## Décisions prises en cours de route

- **Retour `{ parsed, raw }` depuis le serveur** (non planifié, détecté en EVALUATE) : le serveur renvoie maintenant le texte brut de la spec en plus de la représentation parsée. Légère augmentation de la taille de la réponse (~2x), justifiée par la correction du bug de fidélité.
- **Buffer.concat** remplace le reduce O(n²) sur les chunks de streaming.

## Findings EVALUATE traités

| Finding | Action |
|---------|--------|
| O(n²) chunk accumulation | Corrigé → `Buffer.concat(chunks)` |
| Ternaire long dans le catch | Corrigé → variables extraites |
| SSRF check dupliqué | Corrigé → centralisé dans fetchWithRedirects |
| sendParseError dupliqué entre handler et urlHandler | Corrigé → helper partagé |
| `rawSpec = JSON.stringify(ParsedSpec)` (bug) | Corrigé → serveur renvoie `{ parsed, raw }` |

## Patterns observés (pas encore 3 occurrences, à surveiller)

- **Bug de contrat de transformation** : quand un endpoint transforme des données (parse, normalize), le client peut avoir besoin à la fois de la forme originale ET de la forme transformée. Si le serveur ne renvoie que la forme transformée, re-sérialiser pour l'envoyer en aval est une perte silencieuse. À documenter si ça se reproduit.
