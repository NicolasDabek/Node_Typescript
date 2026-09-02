# Node TypeScript starter

Framework générique Express + Sequelize : une table DB devient un CRUD via `/:model`.

## Bootstrap d’un nouveau projet

1. Copier `.env.example` vers `.env` et remplir la DB.
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
