# Brief Claude Design — Design System SLICE

## Contexte produit

**SLICE** est une web app qui transforme une spec API OpenAPI en serveur MCP (Model Context Protocol) sur-mesure. L'utilisateur uploade une spec, coche les endpoints qu'il veut exposer à son agent IA, configure 2-3 trucs, télécharge un ZIP prêt à l'emploi.

**Le pitch en une phrase** : "Curated MCP servers for AI agents" — sélectionne uniquement les endpoints dont ton agent a besoin, économise 60-80% de contexte, livre un serveur MCP fonctionnel en moins de 5 minutes.

## Public cible

- Consultants IA / freelances qui développent des agents pour des clients
- Devs full-stack qui veulent connecter leur backend à un agent
- Agences d'automatisation (n8n, Make, Airia)

Niveau technique : "un peu tech" — comprend les concepts mais déteste le jargon. **Aucun jargon technique visible dans l'UI.**

## Tone & vibe souhaité

- **Sobre, premium, dev-tool moderne** (vibe Linear / Vercel / Resend / Stripe Dashboard)
- **Pas joueur, pas startup**. On est sur du sérieux dev/consulting.
- **Mode sombre par défaut** prévu mais pas obligatoire — design system doit supporter light + dark
- **Pas de gradient pop ni d'illustrations 3D bullshit**. Typo soignée, espaces aérés, micro-interactions discrètes.

## Stack technique (contraintes design)

Le design sera implémenté avec :
- **Tailwind CSS v4** (variables CSS modernes, oklch colors)
- **shadcn/ui** style "new-york", base color "neutral" (à confirmer ou changer)
- Icons : **Lucide React**
- Composants à utiliser en priorité de shadcn : Button, Input, Form, Checkbox, Card, Dialog, Tabs, Badge, Progress, Tooltip

Donc le design doit rester dans les codes de cette stack (pas de glassmorphism ou neumorphism qui sortirait du langage shadcn).

## Écrans à designer (3 étapes principales + écrans annexes)

### Écran 1 — Landing / Upload
- Hero court : titre "SLICE" + tagline "Curated MCP servers for AI agents"
- Sous-titre explicatif 1 ligne
- Dropzone centrale (drag & drop + bouton "Choisir un fichier")
- Texte d'aide : "Glisse ton fichier OpenAPI (JSON ou YAML, max 10 Mo)"
- Footer minimaliste : "Made by [auteur], open source, docs"
- États : Default, Hover (dropzone surlignée), Uploading (progress), Error (fichier invalide)

### Écran 2 — Sélection des endpoints
- Bandeau supérieur : nom de l'API détecté + version + URL de base (éditables au clic)
- Barre d'actions : recherche, boutons bulk ("Tout cocher les lectures", "Tout cocher les écritures", "Tout décocher")
- Liste des endpoints groupés par tag/catégorie (accordéons ou simples sections)
- Chaque ligne : checkbox + libellé humain ("Voir les produits") + badge méthode (GET/POST/PUT/DELETE) + tooltip avec le détail technique au hover (`GET /products?limit=...`)
- Sidebar droite (sticky) : récap "X endpoints sélectionnés", **compteur de contexte économisé** ("-73% vs spec complète"), bouton "Continuer"
- États : Default, Loading (parsing), Empty (aucun endpoint dans la spec), Error

### Écran 3 — Configuration finale
- Formulaire compact avec valeurs auto-détectées et éditables :
  - Nom du serveur MCP
  - URL de base de l'API
  - Type d'auth amont (radio buttons : Aucune / Clé API / Bearer token)
- **Une seule vraie question** mise en avant : "Où ton agent va l'utiliser ?" — 3 cards cliquables :
  - "Sur mon ordi" (Claude Desktop, Cursor, Windsurf)
  - "Sur un serveur en ligne" (n8n, Airia, Zapier)
  - "Les deux"
- Toggle discret "⚙️ Options avancées" qui déplie : token de sécurité HTTP, descriptions détaillées des params
- Bouton principal "Générer mon MCP" (large, primary)
- États : Default, Loading (génération), Success, Error

### Écran 4 — Succès post-génération
- Animation discrète de succès (checkmark)
- Titre : "Ton MCP est prêt"
- 3 étapes claires pour utiliser :
  1. Télécharger le ZIP (bouton principal)
  2. Configurer le `.env` (avec lien vers la doc)
  3. Connecter à l'agent (snippet de config prêt à copier pour Claude Desktop / n8n / Airia, avec onglets)
- Récap : nom du MCP + nombre d'endpoints exposés + contexte économisé
- CTA secondaire : "Générer un autre MCP" ou "Revenir à la sélection"

### Composants transverses
- **Tooltip** pour révéler les détails techniques sans polluer l'UI principale
- **Toast / notification** pour erreurs et succès
- **Modal** pour confirmations critiques (si besoin)
- **Loading skeleton** pour la liste d'endpoints pendant le parsing

## Principes UX à respecter

1. **3 étapes visibles maximum** dans le flow principal
2. **Auto-détection prioritaire** : tout ce qui peut être deviné est pré-rempli
3. **Vocabulaire humain** : pas de "endpoint", "stdio", "Bearer" dans l'UI principale. Le jargon est dans les tooltips/options avancées.
4. **Une seule action principale par écran** (un seul bouton primary visible)
5. **Feedback immédiat** : chaque action a une réaction visuelle (loading, success, error)
6. **Responsive** : desktop prioritaire (cas d'usage = devs avec grands écrans), tablette OK, mobile pas critique mais doit rester utilisable

## Accessibilité

- Contraste WCAG AA minimum (shadcn le respecte par défaut)
- Navigation clavier complète (Tab, Enter, Esc)
- ARIA labels sur les composants interactifs custom
- Focus visible sur tous les éléments interactifs

## Inspirations à étudier

- **Linear** : la sobriété, les espaces, la typo soignée
- **Vercel Dashboard** : la hiérarchie d'information, les cards
- **Resend** : le flow d'onboarding minimaliste
- **Stripe Dashboard** : la densité d'info maîtrisée
- **Raycast** : les listes filtrables, le compteur en temps réel
- **shadcn/ui (la doc elle-même)** : référence absolue du langage visuel à respecter

## Livrables attendus de Claude Design

1. **Une palette de couleurs** (light + dark) cohérente avec shadcn neutral (ou alternative si plus pertinente)
2. **Une échelle typographique** (font family, sizes, weights, line-heights)
3. **Les 4 écrans** en haute fidélité avec leurs principaux états (Default, Loading, Empty, Error, Success)
4. **Les composants custom** qui ne sont pas dans shadcn out-of-the-box (notamment : la dropzone, la card "Où ton agent va l'utiliser", le compteur de contexte économisé)
5. **Le logo / wordmark SLICE** (proposition simple, modifiable)
6. **Un guide de spacing et radius** (grille 4px ou 8px, radius cohérents avec --radius-* shadcn)

## Format des fichiers à me rendre

- Exports PNG haute résolution pour les écrans
- Ou screenshots Figma / Sketch si tu utilises ces outils
- À placer dans `.workflow/visuals/` du projet
- Si possible : un fichier `DESIGN-NOTES.md` avec les décisions importantes (pourquoi telle couleur, telle font, etc.)
