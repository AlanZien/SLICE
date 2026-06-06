# PLAN — upload-url : upload par URL

## Objectif
Permettre à l'utilisateur de coller une URL HTTPS au lieu de déposer un fichier. SSRF-safe.

## Couverture SPEC (backlog)
| Règle | Tâche |
|---|---|
| `https://` uniquement | url-fetcher : rejet `URL_INVALID` |
| IPs privées bloquées après DNS | assertPublicUrl existant, réutilisé |
| Timeout 5s | AbortController |
| Limite 10 Mo | Content-Length check + accumulation |
| Max 3 redirects, chaque hop re-vérifié | fetchWithRedirects récursif |
| User-Agent identifiable | header `SLICE/1.0` |
| Codes d'erreur dédiés | `URL_INVALID`, `URL_FETCH_FAILED`, `URL_PRIVATE_IP_BLOCKED`, `URL_TIMEOUT`, `URL_TOO_LARGE` |
| Toggle UI file/URL | upload.tsx |

## Fichiers impactés
| Fichier | Changement |
|---|---|
| `src/server/services/url-fetcher.ts` | Nouveau — fetch SSRF-safe + redirects |
| `src/server/routes/upload.ts` | Nouveau handler `POST /api/upload-url` |
| `src/server/app.ts` | Câbler la route `/api/upload-url` |
| `src/client/lib/api.ts` | Nouvelle fonction `uploadSpecFromUrl` |
| `src/client/screens/upload.tsx` | Toggle file/URL + champ URL |

## Tâches

### Backend

- [ ] RED : test `fetchSpecFromUrl` — https only, IP privée bloquée, timeout, trop grand, 3 redirects max, redirect vers IP privée bloquée
- [ ] GREEN : `src/server/services/url-fetcher.ts`
  - `UrlFetchError` avec `code: UrlErrorCode`
  - `fetchWithRedirects(url, signal, hops)` : `redirect:'manual'`, max 3 hops, `assertPublicUrl` à chaque hop, User-Agent `SLICE/1.0`
  - `fetchSpecFromUrl(url)` : validate https, assertPublicUrl, AbortController 5s, Content-Length pré-check, accumulation max 10Mo, retourne string
- [ ] RED : test handler `POST /api/upload-url` — body `{ url }` → parse → 200 ; URL absente → 400 ; URL invalide → 400 ; SSRF → 400
- [ ] GREEN : handler dans `upload.ts` + câblage dans `app.ts`

### Frontend

- [ ] RED : test upload.tsx — toggle file/URL visible ; soumission URL appelle `uploadSpecFromUrl`
- [ ] GREEN : toggle dans `upload.tsx` + `uploadSpecFromUrl` dans `api.ts`

## Definition of Done
- Tests verts (hors use-theme)
- `assertPublicUrl` réutilisé sans duplication
- Chaque hop de redirect re-vérifié SSRF
- Timeout 5s, limite 10Mo, User-Agent
- L'UI existante (dropzone) est inchangée en mode fichier
