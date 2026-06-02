# Conventions de code

## Naming

- Fichiers : {{PascalCase pour composants, kebab-case pour utilitaires}}
- Variables/fonctions : {{camelCase}}
- Constantes : {{SCREAMING_SNAKE_CASE}}
- Types/Interfaces : {{PascalCase, suffixe Props/State/Context si applicable}}

## Structure des fichiers

- {{Un composant par fichier}}
- {{Tests a cote du fichier source : fichier.test.ts}}
- {{Imports groupes : externes > internes > relatifs}}

## Patterns utilises

- {{Composition > heritage}}
- {{Fonctions pures privilegiees}}
- {{Gestion d'erreur : ...}}

## A eviter

- {{Pas de any en TypeScript}}
- {{Pas de console.log en production}}
- {{Pas de logique metier dans les composants UI}}

## Patterns promus (LEARN)

### Génération de code : encoder toute donnée externe via `JSON.stringify`
*Issu de LEARN après 3 occurrences détectées (clés de params, description des tools, tokenUrl/scopes — ces 2 dernières ont causé 2 RCE HIGH au chantier OAuth, 2026-06-02).*

Toute valeur d'origine externe (spec OpenAPI uploadée, config postée à `/api/generate`) injectée dans le **code généré** (templates `.hbs`) est une surface d'**injection de code** : une apostrophe/backtick/`${}`/newline dans la valeur casse hors de la string-literal et exécute du code chez l'utilisateur qui lance le kit. Règles :
- **Toujours `JSON.stringify`** la valeur côté générateur, puis l'injecter via Handlebars (`noEscape: true`) — ça produit un littéral double-quoté complet et échappé. Jamais d'interpolation brute `'{{x}}'` ni d'échappement maison (`.replace(/'/g, ...)` est fragile : ne couvre ni backslash, ni newline, ni backtick).
- **Défense secondaire** : valider/rejeter les caractères de breakout au niveau du schéma Zod partagé (couvre aussi les chemins qui ne passent pas par le générateur).
- Ne jamais supposer qu'une validation amont (ex. `new URL().href`) neutralise les quotes — elle ne le fait pas.

---
Ce fichier est mis a jour par le workflow FORGE (phase LEARN) quand des patterns recurrents sont detectes.
