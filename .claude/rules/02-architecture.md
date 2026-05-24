# Architecture

## Modules

| Module | Responsabilite | Dependances |
|--------|---------------|-------------|
| {{module}} | {{role}} | {{deps}} |

## Regles de dependances

- {{Les composants UI ne doivent pas acceder directement a la DB}}
- {{La logique metier est isolee dans lib/ ou services/}}
- {{Les routes/controllers sont fins — ils delegent aux services}}

## Patterns architecturaux

- {{MVC / Clean Architecture / Feature-based / ...}}
- {{State management : ...}}
- {{Data fetching : ...}}

## Limites et contraintes

- {{Pas de dependance circulaire entre modules}}
- {{Les services externes sont wrapes dans des adapters}}

---
Ce fichier est mis a jour par le workflow FORGE (phases ORIENT et LEARN).
