# PLAN — fail-loud (rapport de génération)

## Objectif

Ajouter à chaque endpoint un champ `approximations?` tagguant les dégradations silencieuses (schema fallback, body non-JSON droppé, cookie params non transmis), puis afficher sur le screen 3 un compteur `N/N endpoints in MCP` + détail des approximations parmi les endpoints sélectionnés.

## Fichiers impactés

| Fichier | Ce qui change |
|---------|--------------|
| `src/shared/types.ts` | `ApproximationKind` + `Endpoint.approximations?` |
| `src/server/services/spec-normalizer.ts` | Helper `hasComplexSchema` + détection dans `collectGroups` |
| `src/server/services/spec-normalizer.test.ts` | Tests T1-T10 (nouveau describe) |
| `src/client/screens/config.tsx` | `useMemo` rapport + composant `<GenerationReport>` inline |
| `src/client/screens/config.test.tsx` | Tests F1-F5 |

## Couverture SPEC → tâches

| Règle SPEC | Tâche |
|------------|-------|
| R1 — 3 kinds | T2+T3 (TDD normalizer) |
| R2 — types partagés | T1 (shared/types.ts) |
| R3 — détection pendant normalisation | T3 (GREEN) |
| R4 — calcul rapport côté client | T5 (useMemo config.tsx) |
| R5 — bandeau compteur + détail | T4+T5 (TDD config) |
| R6 — pas de route backend | Couvert par scope (aucune route touchée) |

---

## Tâches

### T1 — Types partagés (pas de TDD — types purs)
**Fichier** : `src/shared/types.ts` après ligne 77 (fin de `Endpoint`)

Ajouter :
```typescript
export type ApproximationKind = 'non_json_body' | 'cookie_param' | 'schema_fallback';
```

Dans `interface Endpoint` (après `tokens?`) :
```typescript
/** Approximations détectées pendant la normalisation. Absent ou vide = fully supported. */
approximations?: ApproximationKind[];
```

Commit : `feat: add ApproximationKind + Endpoint.approximations to shared types`

---

### T2 — Tests normalizer RED (T1-T10)
**Fichier** : `src/server/services/spec-normalizer.test.ts` — nouveau `describe('approximations')`

Construire les specs OpenAPI minimales nécessaires (inline dans les tests, pas de fixtures fichier) pour couvrir :
- T1 : requestBody multipart/form-data sans `application/json` → `non_json_body`
- T2 : requestBody `application/json` valide → PAS `non_json_body`
- T3 : param `in: 'cookie'` → `cookie_param`
- T4 : param query avec `schema: { oneOf: [...] }` → `schema_fallback`
- T5 : param query avec `schema: { anyOf: [...] }` → `schema_fallback`
- T6 : param query avec `schema: { allOf: [...] }` → `schema_fallback`
- T7 : param query avec `schema: { type: 'xml' }` → `schema_fallback`
- T8 : endpoint GET query string + types reconnus → `approximations` absent ou `[]`
- T9 : endpoint GET path-only, pas de schéma → `approximations` absent ou `[]`
- T10 : requestBody multipart ET cookie param → les deux codes présents

Commit : `test: approximation detection in spec-normalizer (RED)`

---

### T3 — Implémentation normalizer GREEN + REFACTOR
**Fichier** : `src/server/services/spec-normalizer.ts`

**Step 1** — Ajouter `ApproximationKind` à l'import depuis `@shared/types`.

**Step 2** — Ajouter helper après la constante `SUPPORTED_METHODS` (~ligne 27) :
```typescript
const RECOGNIZED_SCHEMA_TYPES = new Set([
  'string', 'integer', 'number', 'boolean', 'array', 'object',
]);

function hasComplexSchema(schema: any): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (schema.oneOf != null || schema.anyOf != null || schema.allOf != null) return true;
  return typeof schema.type === 'string' && !RECOGNIZED_SCHEMA_TYPES.has(schema.type);
}
```

**Step 3** — Dans `collectGroups`, remplacer la ligne 104 :
```typescript
// AVANT :
params.push(...flattenRequestBody(op.requestBody, existingNames));

// APRÈS :
const bodyParams = flattenRequestBody(op.requestBody, existingNames);
params.push(...bodyParams);
```

**Step 4** — Calculer les approximations juste avant la construction de `endpoint` (entre `params.push` et `const endpoint = {`):
```typescript
const approximations: ApproximationKind[] = [];

// non_json_body : requestBody existe mais aucun JSON body param généré
if (op.requestBody != null && bodyParams.length === 0) {
  approximations.push('non_json_body');
}

// cookie_param : au moins un param cookie (parsé mais non transmis au runtime)
if (params.some((p) => p.in === 'cookie')) {
  approximations.push('cookie_param');
}

// schema_fallback : schéma trop complexe (oneOf/anyOf/allOf/type inconnu)
// — vérifier les params raw (path/query/header) + le schéma body (root + propriétés)
const rawParams = [...pathLevelParams, ...(Array.isArray(op.parameters) ? op.parameters : [])];
const rawBodySchema = op.requestBody?.content?.['application/json']?.schema;
const bodyPropSchemas = rawBodySchema?.type === 'object' && rawBodySchema?.properties
  ? Object.values(rawBodySchema.properties as Record<string, any>)
  : [];
if (
  rawParams.some((p: any) => p?.in !== 'cookie' && hasComplexSchema(p?.schema)) ||
  (bodyParams.length > 0 && (hasComplexSchema(rawBodySchema) || bodyPropSchemas.some(hasComplexSchema)))
) {
  approximations.push('schema_fallback');
}
```

**Step 5** — Ajouter à la construction de `endpoint` (~ligne 106) :
```typescript
...(approximations.length > 0 ? { approximations } : {}),
```

Commits : `feat: detect approximations per endpoint in spec-normalizer (GREEN)` puis `refactor: ...` si besoin.

---

### T4 — Tests ConfigScreen RED (F1-F5)
**Fichier** : `src/client/screens/config.test.tsx`

Construire des `ParsedSpec` mockées avec `approximations` variés. Les tests vérifient la présence / absence du rapport dans le rendu :
- F1 : tous full → pas de ligne `⚠` ni `⬜` ni `🔒`, compteur `N / N endpoints in MCP · All fully supported` affiché
- F2 : un endpoint `schema_fallback` sélectionné → ligne ⚠ visible
- F3 : counts corrects (F fully supported, X schema_fallback, Y non_json_body)
- F4 : endpoint partial NON sélectionné → pas de ligne ⚠
- F5 : 3 sélectionnés → `3 / 3 endpoints in MCP`

Commit : `test: GenerationReport in ConfigScreen (RED)`

---

### T5 — Implémentation ConfigScreen GREEN + REFACTOR
**Fichier** : `src/client/screens/config.tsx`

**Step 1** — Ajouter `ApproximationKind` à l'import depuis `@shared/types`.

**Step 2** — Nouveau `useMemo` dans `ConfigScreen` (après le memo existant ~ligne 95) :
```typescript
const report = useMemo(() => {
  const allEndpoints = spec.groups.flatMap((g) => g.endpoints);
  const selectedSet = new Set(selectedIds);
  const chosen = allEndpoints.filter((e) => selectedSet.has(e.id));
  const total = chosen.length;
  let full = 0, schemaFallback = 0, nonJsonBody = 0, cookieParam = 0;
  for (const e of chosen) {
    const kinds = e.approximations ?? [];
    if (kinds.length === 0) { full++; continue; }
    if (kinds.includes('schema_fallback')) schemaFallback++;
    if (kinds.includes('non_json_body')) nonJsonBody++;
    if (kinds.includes('cookie_param')) cookieParam++;
  }
  return { total, full, schemaFallback, nonJsonBody, cookieParam };
}, [spec, selectedIds]);
```

**Step 3** — Ajouter `<GenerationReport>` au bas de la section gauche (avant le tag `</section>` fermant, ~ligne 200), juste avant le `</div className="mx-auto...">` :

```tsx
<GenerationReport report={report} />
```

**Step 4** — Composant inline (dans le même fichier, avant `ConfigScreen`) :
```tsx
interface ReportProps {
  report: { total: number; full: number; schemaFallback: number; nonJsonBody: number; cookieParam: number };
}
function GenerationReport({ report }: ReportProps) {
  const { total, full, schemaFallback, nonJsonBody, cookieParam } = report;
  const hasApprox = schemaFallback > 0 || nonJsonBody > 0 || cookieParam > 0;
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-xs text-muted-foreground space-y-1">
      <div className="flex items-center gap-2 text-foreground font-medium">
        <span>{total} / {total} endpoints in MCP</span>
        {!hasApprox && <span className="text-emerald-500">· All fully supported</span>}
      </div>
      {hasApprox && (
        <ul className="space-y-0.5 pl-1">
          <li>✓ {full} fully supported</li>
          {schemaFallback > 0 && <li>⚠ {schemaFallback} with approximated schema (oneOf / anyOf → string)</li>}
          {nonJsonBody > 0 && <li>⬜ {nonJsonBody} with no body support (non-JSON request body)</li>}
          {cookieParam > 0 && <li>🔒 {cookieParam} with cookie params (not transmitted at runtime)</li>}
        </ul>
      )}
    </div>
  );
}
```

Commits : `feat: GenerationReport component in ConfigScreen (GREEN)` puis refactor si besoin.

---

## Tests TDD résumé

| Test | Fichier | Critère |
|------|---------|---------|
| T1 | spec-normalizer.test.ts | non_json_body détecté sur multipart |
| T2 | spec-normalizer.test.ts | non_json_body absent sur JSON body |
| T3 | spec-normalizer.test.ts | cookie_param détecté |
| T4-T6 | spec-normalizer.test.ts | schema_fallback sur oneOf/anyOf/allOf |
| T7 | spec-normalizer.test.ts | schema_fallback sur type inconnu |
| T8-T9 | spec-normalizer.test.ts | aucune approximation sur endpoint clean |
| T10 | spec-normalizer.test.ts | cumul non_json_body + cookie_param |
| T11 | spec-normalizer.test.ts | schema_fallback sur propriété body flattenée (oneOf dans properties) |
| F1 | config.test.tsx | compteur visible, pas de détail si all full |
| F2 | config.test.tsx | ligne ⚠ si schema_fallback sélectionné |
| F3 | config.test.tsx | counts corrects |
| F4 | config.test.tsx | partial non sélectionné n'impacte pas |
| F5 | config.test.tsx | compteur N/N correct |

## Definition of Done

- [ ] `pnpm typecheck` propre
- [ ] `pnpm test` : 16 nouveaux tests verts + aucune régression
- [ ] Screen 3 : compteur `N/N endpoints in MCP` toujours visible
- [ ] Screen 3 : lignes de détail uniquement si au moins une approximation parmi les sélectionnés
- [ ] Corpus check non régressif (`pnpm corpus:check 20` sans nouveau crash)
