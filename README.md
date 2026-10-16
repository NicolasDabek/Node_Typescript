# Node TypeScript starter

Framework générique Express + Sequelize : une table DB devient un CRUD via `/:model`.

## Bootstrap d’un nouveau projet

1. Copier `.env.example` vers `.env` et le remplir. Variables obligatoires (l'appli refuse de démarrer sans elles) : `JWT_SECRET`, `SECRET_SESSION`, `DB_USERNAME`, `DB_PASSWORD`. La connexion DB (`DB_ADDRESS`, `DB_NAME`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`) est lue via `config/custom-environment-variables.json` ; aucun identifiant n'est codé en dur dans `config/*.json`.
2. `npm install`
3. `npm run gen-all` — models, init-models, DTOs, swagger, tests.
4. `npm run db:migrate` (ou `DB_SYNC=true` en dev seulement).
5. `npm run dev`

## Commandes

- `npm run cli all` — tout régénérer
- `npm run gen-resource -- orders` — route/controller/service custom
- `CRUD_BLOCKED_MODELS=users` — modèles exclus du CRUD générique
- `GENERIC_CRUD_AUTH=true` — JWT obligatoire sur le CRUD

Swagger runtime : `/swagger/api-docs`
