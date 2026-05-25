# Retrospectives

## 2026-05-25 — Phase 01 (Squelette) ✓ mergée

Synthèse courte (détail dans `.workflow/phases/01-skeleton/REVIEW.md`) :
- TDD propre, 4 cycles, 20/20 verts au premier coup.
- EVALUATE STANDARD : 0 Bloquant, 3 Important corrigés en < 10 min, 6 À considérer reportés.
- Surprise : repo déjà bootstrappé hors phase BOOTSTRAP — décalage avec CLAUDE.md "Phase en cours". Pas de pattern récurrent à promouvoir (1 occurrence).
- Patterns à observer en phases 02–04 : PLAN ↔ code drift, concat de classes verbeux, config Express globale.

## Findings "à considérer" en attente (alimentés par EVALUATE, traités en LEARN)

### Après phase 01 — Squelette (2026-05-25)

- **[Sécurité]** CORS global ouvert (`cors()` sans config). À restreindre en phase 11 via origines explicites dev/prod. Déjà prévu dans PLAN 11 (T3).
- **[Sécurité]** Body limit `express.json({ limit: '10mb' })` global. À reconfigurer route par route en phase 08 (`/api/generate` à 15 Mo, cf. R1.6.8) et phase 02 (`/api/upload` à 10 Mo via multer).
- **[Sécurité]** Inline script de FOUC prevention dans `index.html` accède à `localStorage`. À transformer en script externe statique (ou hash CSP) quand helmet+CSP arriveront en phase 11.
- **[Qualité]** Patterns de concat de classes via `[].filter(Boolean).join(' ')` dans `stepper.tsx` et `topbar.tsx`. Le helper `cn()` existe déjà dans `src/client/lib/utils.ts`. Uniformiser en passant via `cn()` partout. **À promouvoir en règle si le pattern réapparaît en phase 02–04.**
- **[Cohérence]** Padding topbar `px-5` (20px) vs SPEC §2.1 qui mentionne 18px. Écart de 2px assumé pour rester sur l'échelle Tailwind par défaut. À reconfirmer en phase 12 (audit visuel final).
- **[Tests]** Pas de tests pour le 404, le rate-limit, le static serve en prod. Pas exigé par PLAN 01. À regarder si pattern récurrent de couverture incomplète en phase 02+.

---
Alimente par le workflow FORGE (phase LEARN).
Les patterns recurrents sont promus dans .claude/rules/ pour influencer les futures sessions.
