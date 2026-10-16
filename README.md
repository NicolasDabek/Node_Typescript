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

## Comment les routes sont créées

- `src/routes/index.ts` charge automatiquement chaque `src/routes/*.route.ts` (routes spécifiques, ex. `users.route.ts` : register/login), puis le CRUD générique `BaseRoute`.
- `BaseRoute` expose `/:model` pour **tout modèle Sequelize** de `src/models` (généré par `gen-models` / `gen-init-models`) :
  `GET /:model`, `GET /:model/:id`, `GET /:model/onefield/:fieldName`, `GET /:model/multiple/:fieldName/:fieldVal`, `POST /:model`, `PUT /:model/:id`, `DELETE /:model/:id`.
- Le corps de POST/PUT est validé avec les DTOs générés (`gen-dtos`).
- Accès : `CRUD_BLOCKED_MODELS` (défaut `users`), `CRUD_ALLOWED_MODELS` (liste blanche optionnelle), `GENERIC_CRUD_AUTH=true` (JWT obligatoire). Un modèle bloqué répond 403 avant toute validation.

### Surcharges par modèle (optionnel)

Créer `src/crud/overrides/<modele>.crud.ts` (chargé automatiquement, même convention que `*.route.ts`) :

```ts
import { CrudModelOptions } from '../crud.interface';

const ordersCrud: CrudModelOptions = {
  exposed: true,                 // force l'exposition / le blocage (sinon variables d'env)
  auth: true,                    // JWT requis pour ce modèle (sinon GENERIC_CRUD_AUTH)
  operations: ['list', 'read'],  // lecture seule
  hiddenFields: ['secret'],      // jamais renvoyé ni filtrable
  hooks: { beforeCreate: data => ({ ...data, createdBy: 'api' }) },
};
export default ordersCrud;
```

Exemple fourni : `users.crud.ts` (mot de passe hashé à l'écriture, jamais renvoyé).

## Documentation API (Swagger / OpenAPI)

- Servie par l'appli sur `/swagger/api-docs` (Swagger UI servi localement depuis `node_modules`, aucun CDN).
- Générée automatiquement depuis les routes enregistrées et les modèles Sequelize : schémas lecture / création / mise à jour, champs requis pris des DTOs, réponses et codes d'erreur (400/401/403/404/500), sécurité bearer JWT pour les modèles avec `auth`. Les modèles bloqués sont exclus du CRUD documenté. Un nouveau modèle est documenté sans aucune action manuelle.
- `npm run gen-docs` écrit le même document dans `docs/api/openapi.json` (+ un fichier `swagger-<modele>.json` par modèle).

## Tests

Deux familles, séparées en projets Jest (`jest.config.js`) :

| Commande | Contenu | Base requise |
|---|---|---|
| `npm test` / `npm run test:unit` | Tests unitaires `tests/unit/**` : utils, services, contrôleurs, middlewares, `validateEnv`, JWT, règles d'exposition et surcharges CRUD, chargeur de routes, générateur OpenAPI, générateurs `gen-*`. Sequelize, `req`/`res`, env et fs sont mockés. | Non |
| `npm run test:coverage` | Tests unitaires + couverture, avec seuils minimaux (`coverageThreshold` : 99 % lignes/instructions, 95 % branches/fonctions) ; une baisse fait échouer la commande. | Non |
| `npm run test:integration` | `tests/models/**` (générés par `gen-tests`) et `tests/integration/**` (auth, Swagger) contre une vraie base. | Oui |
| `npm run test:all` | Unitaires puis intégration. | Oui |

Les tests unitaires fixent eux-mêmes leur environnement (`tests/unit/setup-env.ts`, avec un port de base invalide : tout accès réel à la base échouerait). Ils vérifient aussi que `gen-tests`, `gen-dtos` et `gen-init-models` reproduisent exactement les fichiers commités, sans rien écrire sur le disque.

Les tests d'intégration nécessitent MySQL/MariaDB et les variables obligatoires (`JWT_SECRET`, `SECRET_SESSION`, `DB_USERNAME`, `DB_PASSWORD`). Avec `DB_SYNC=true` les tables sont créées depuis les modèles. `npm run gen-tests` régénère `tests/models/*.test.ts` (test 401/403 pour les modèles non exposés, CRUD complet sinon).
