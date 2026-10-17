# Node TypeScript starter

Framework générique Express + Sequelize : une table DB devient un CRUD via `/:model`.

## Bootstrap d’un nouveau projet

Node.js >= 20 (requis par nodemailer 10).

1. Copier `.env.example` vers `.env` et le remplir. Variables obligatoires (l'appli refuse de démarrer sans elles) : `JWT_SECRET`, `SECRET_SESSION` (sauf `SESSION_ENABLED=false`), `DB_USERNAME`, `DB_PASSWORD`. La connexion DB (`DB_ADDRESS`, `DB_NAME`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`) est lue via `config/custom-environment-variables.json` ; aucun identifiant n'est codé en dur dans `config/*.json`.
2. `npm install`
3. `npm run gen-all` — models, init-models, DTOs, swagger, tests.
4. `npm run db:migrate` (ou `DB_SYNC=true` en dev seulement).
5. `npm run dev`

### Production

- `npm run build` (nécessite les devDependencies : `typescript`, `tsc-alias`), puis sur le serveur `npm ci --omit=dev` et `NODE_ENV=production npm start` (`node -r dotenv/config dist/src/index.js`, sans `ts-node` ni `cross-env`). `NODE_ENV` vient de l'environnement ou du `.env`. En local, `npm run start:prod` enchaîne build + démarrage en production.
- Swagger est désactivé en production (`SWAGGER_ENABLED=true` pour le réactiver, `SWAGGER_ENABLED=false` pour le couper ailleurs).
- Sessions : cookie `httpOnly`, `sameSite=lax`, `secure` en production, nom `SESSION_COOKIE_NAME` (défaut `sid`). Le MemoryStore d'express-session n'est pas utilisable en production : l'appli refuse de démarrer sans store. Soit passer un store dans `src/index.ts` (`new App(routes, false, { sessionStore: new RedisStore(...) })`, via connect-redis, connect-session-sequelize...), soit désactiver les sessions avec `SESSION_ENABLED=false` (l'API JWT n'en a pas besoin). Derrière un reverse proxy HTTPS, définir `TRUST_PROXY` (`true` = 1 saut, ou une valeur acceptée par Express) pour que le cookie `secure` soit émis.
- CORS : seules les origines de `CORS_ORIGINS` (séparées par des virgules) sont autorisées, avec credentials. Vide par défaut : aucune origine tierce.
- JWT : signés et vérifiés uniquement en HS256.

## Commandes

- `npm run cli all` — tout régénérer
- `npm run gen-resource -- orders` — route/controller/service custom
- `CRUD_BLOCKED_MODELS=users` — modèles exclus du CRUD générique
- `GENERIC_CRUD_PUBLIC_READ=true` — lectures du CRUD générique sans JWT (JWT exigé par défaut partout)

## Comment les routes sont créées

- `src/routes/index.ts` charge automatiquement chaque `src/routes/*.route.ts` (routes spécifiques, ex. `users.route.ts` : register/login), puis le CRUD générique `BaseRoute`.
- `BaseRoute` expose `/:model` pour **tout modèle Sequelize** de `src/models` (généré par `gen-models` / `gen-init-models`) :
  `GET /:model`, `GET /:model/:id`, `GET /:model/onefield/:fieldName`, `GET /:model/multiple/:fieldName/:fieldVal`, `POST /:model`, `PUT /:model/:id`, `DELETE /:model/:id`.
- Le corps de POST/PUT est validé avec les DTOs générés (`gen-dtos`).
- Accès : `CRUD_BLOCKED_MODELS` (défaut `users`), `CRUD_ALLOWED_MODELS` (liste blanche optionnelle). Un modèle bloqué répond 403 avant toute validation.
- Authentification : **JWT exigé par défaut** sur toutes les opérations du CRUD générique (401 sans token). Les lectures (`list`, `read`, `field`, `search`) ne deviennent anonymes que si on l'active explicitement : `GENERIC_CRUD_PUBLIC_READ=true` (tous les modèles) ou `publicRead: true` dans une surcharge. Les écritures (`create`, `update`, `delete`) restent protégées ; seule une surcharge `auth: false` explicite rend un modèle entièrement anonyme. L'ancienne variable `GENERIC_CRUD_AUTH` n'a plus d'effet.

### Surcharges par modèle (optionnel)

Créer `src/crud/overrides/<modele>.crud.ts` (chargé automatiquement, même convention que `*.route.ts`) :

```ts
import { CrudModelOptions } from '../crud.interface';

const ordersCrud: CrudModelOptions = {
  exposed: true,                 // force l'exposition / le blocage (sinon variables d'env)
  publicRead: true,              // lectures sans JWT (écritures toujours protégées)
  // auth: false,                // rend TOUT le CRUD du modèle anonyme : à éviter
  operations: ['list', 'read'],  // lecture seule
  hiddenFields: ['secret'],      // jamais renvoyé ni filtrable
  hooks: { beforeCreate: data => ({ ...data, createdBy: 'api' }) },
};
export default ordersCrud;
```

Exemple fourni : `users.crud.ts` (mot de passe hashé à l'écriture, jamais renvoyé).

## Documentation API (Swagger / OpenAPI)

- Servie par l'appli sur `/swagger/api-docs` (hors production, voir `SWAGGER_ENABLED`) (Swagger UI servi localement depuis `node_modules`, aucun CDN).
- Générée automatiquement depuis les routes enregistrées et les modèles Sequelize : schémas lecture / création / mise à jour, champs requis pris des DTOs, réponses et codes d'erreur (400/401/403/404/500), sécurité bearer JWT sur chaque opération qui l'exige (toutes par défaut). Les modèles bloqués sont exclus du CRUD documenté. Un nouveau modèle est documenté sans aucune action manuelle.
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

Les tests d'intégration créent les tables avant les suites (`tests/integration/global-setup.ts`, si `DB_SYNC=true`) ; les tests CRUD générés obtiennent un JWT via `tests/helpers/auth.ts` et vérifient aussi le 401 anonyme. Ils nécessitent MySQL/MariaDB et les variables obligatoires (`JWT_SECRET`, `SECRET_SESSION`, `DB_USERNAME`, `DB_PASSWORD`). Avec `DB_SYNC=true` les tables sont créées depuis les modèles. `npm run gen-tests` régénère `tests/models/*.test.ts` (test 401/403 pour les modèles non exposés, CRUD complet sinon).
