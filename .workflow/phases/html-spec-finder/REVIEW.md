# REVIEW — html-spec-finder (PR #40, mergé 2026-06-06)

## Ce qui a bien fonctionné

- **Cascade discovery claire** : inline `<script>` → liens `<a>`/`<link>` → chemins communs. Séquence naturelle à expliquer et à tester.
- **Extraction `fetchRaw`** : factoriser le timeout/SSRF/read-body en un helper privé a simplifié `fetchSpecFromUrl` et permis de réutiliser la même logique pour les candidats sans duplication.
- **TDD fluide** : les 3 fichiers (html-spec-finder, url-fetcher, upload.ts) couverts par 17 nouveaux tests, tous verts dès la première implémentation.
- **EVALUATE a amélioré la sécurité** : le re-throw de `URL_PRIVATE_IP_BLOCKED` dans `resolveSpecFromHtml` (vs avaler silencieusement) a été attrapé par l'agent altitude. Sans cette correction, un lien SSRF embarqué dans une page HTML aurait été bloqué sans que le serveur remonte l'erreur correctement.

## Ce qui a été difficile / décisions prises

- **Regex vs HTML parser** : l'agent altitude a recommandé `cheerio`/`parse5`. Écarté consciemment — nouvelle dépendance lourde pour un besoin qui fonctionne avec des regex simples sur des pages bien formées (portails API publics). Dette tracée dans BACKLOG si edge cases regex apparaissent en prod.
- **`isSpecLike` trop étroit** : la version initiale exigeait extension (.json/.yaml) ET keyword. L'agent simplification a signalé que `/api-docs` (dans `COMMON_PATHS`) serait ignoré s'il apparaissait en lien. Corrigé en EVALUATE : patterns sans extension acceptés si le chemin est explicitement reconnu (`/api-docs`, `/v{n}/api-docs`, `/openapi`, `/swagger`).
- **matchAll() vs global regex + lastIndex** : les globals avec `.lastIndex = 0` manuel exposaient un risque de concurrence async (Node.js single-threaded mais les await intercalent). Remplacé par `matchAll()` avec regex locale à chaque appel — plus simple et sans état partagé.
- **Parallélisation des candidats** : l'agent efficacité a proposé `Promise.race()`. Écarté pour le MVP (complexité, bandwidth × 10 inutilement, cas rare). Sequential est acceptable — on tente les liens d'abord (souvent 1 seul) puis les chemins communs.

## Findings "à considérer" d'EVALUATE

- **`commonSpecPaths` ignore le chemin de la page** : probing toujours à l'origin. Pour `/api/docs/charges`, sonde `/openapi.json` au lieu de `/api/openapi.json`. Impact faible (les paths communs couvrent `/api/openapi.json`), mais pourrait manquer des APIs versionnées. → BACKLOG.
- **XHTML** : `application/xhtml+xml` ajouté à `isHtmlLike()`. Pas de test dédié (cas rarissime). → Si signalé en prod, ajouter test.
- **HTML commentaire avec href** : un `<!-- <a href="/openapi.json"> -->` serait faussement extrait. Impact faible (URL essayée, 404, suivant). Tolérable sans HTML parser.

## Patterns — analyse vs RETRO précédents

Aucun nouveau pattern à 3 occurrences détecté. Le pattern "endpoint transformation → client a besoin original + résultat" (signalé dans upload-url REVIEW) reste à 2 occurrences.

Le pattern "SSRF se rethrow, ne jamais avaler silencieusement" est nouveau ici (1ère occurrence formelle dans une boucle de candidats). À surveiller.
