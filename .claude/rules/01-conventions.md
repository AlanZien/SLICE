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

---
Ce fichier est mis a jour par le workflow FORGE (phase LEARN) quand des patterns recurrents sont detectes.
