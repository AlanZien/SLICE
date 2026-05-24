# SLICE — Curated MCP Servers for AI Agents

Générateur web qui transforme une spec OpenAPI en serveur MCP (Model Context Protocol) sur-mesure. Sélectionne uniquement les endpoints à exposer à ton agent IA, télécharge le code prêt à l'emploi.

## Pourquoi SLICE

- **Réduction du contexte agent de 60-80%** vs. exposer toute l'API
- **Sécurité** : whitelist explicite des endpoints (l'agent ne peut pas appeler ce que tu n'as pas autorisé)
- **Zéro code à écrire** : upload spec → coche endpoints → télécharge MCP
- **Marche partout** : Claude Desktop, Cursor, Windsurf, n8n, Airia (transports stdio + HTTP Streamable)

## Stack

- **Front** : React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Back** : Node.js + Express + TypeScript (monolithe, sert front statique + API)
- **Code MCP généré** : `@modelcontextprotocol/sdk` (TypeScript)
- **Tests** : Vitest + Testing Library
- **Package manager** : pnpm

## Prérequis

- Node.js >= 20 (LTS recommandé)
- pnpm >= 9 (`npm install -g pnpm`)

## Installation

```bash
git clone <url-repo>
cd SLICE
pnpm install
```

## Commandes principales

```bash
# Développement (front + back en parallèle, hot reload)
pnpm dev

# Front seul (Vite, port 5173)
pnpm dev:client

# Back seul (Express, port 3001)
pnpm dev:server

# Build de production (front + back)
pnpm build

# Lancer en production (après build)
pnpm start

# Tests
pnpm test          # une fois
pnpm test:watch    # mode watch
pnpm test:ui       # interface graphique Vitest

# Vérification TypeScript
pnpm typecheck
```

## Structure du projet

```
SLICE/
├── src/
│   ├── client/              # Frontend React
│   │   ├── components/      # Composants React
│   │   │   └── ui/          # Composants shadcn/ui
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utils (cn, etc.)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css        # Tailwind + shadcn theme
│   ├── server/              # Backend Express
│   │   ├── routes/          # Route handlers
│   │   ├── services/        # Logique métier
│   │   └── templates/       # Templates Handlebars (code MCP généré)
│   └── shared/              # Code partagé front/back (types, schémas Zod)
├── public/                  # Assets statiques
├── docs/                    # Documentation interne
├── .workflow/               # Fichiers du workflow FORGE (PRD, SPEC, etc.)
└── dist/                    # Output de build
```

## Documentation

- **Spec produit complète** : [SLICE.md](SLICE.md)
- **PRD validé** : [.workflow/PRD.md](.workflow/PRD.md)
- **API backend** : [docs/API.md](docs/API.md)

## Statut

🏗️ En cours de développement (phase BOOTSTRAP terminée — la suite : SPEC technique).

## Licence

MIT
