import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getMetadataStorage } from 'class-validator';
import { dtos, DtoKeys, createDtos } from '../dtos';
import BaseRoute from '../routes/base.route';
import App from '../app';
import Route from '../interfaces/routes.interface';
import { RouteForSwagger } from '../interfaces/routeForSwagger.interface';
import { convertDtoToSchema } from './convertDtoToSchema';

const allRoutesList = [new BaseRoute()];
export const appForSwagger = new App(allRoutesList, true);
const allRoutesInAppSwagger: Route[] = appForSwagger.routes;
const SWAGGER_DOCS_PATH = (subPath: string[] = []) => join(__dirname, '../swaggerDocs', ...subPath);

// Fonction pour lister les routes d'un routeur spécifique
function listRouterRoutes(routes: Route) {
  const routesPushed: RouteForSwagger[] = [];
  routes.router.stack?.forEach((middleware) => {
    if (middleware.route) {
      const method = Object.keys(middleware.route["methods"])[0].toUpperCase();
      const path = middleware.route.path;

      // Détection de modèle dynamique
      if (path.includes('/:model')) {
        Object.keys(dtos).forEach((modelName: keyof typeof dtos) => {
          routesPushed.push({
            method,
            path: path.replace('/:model', `/${modelName}`),
            modelName,
            dto: dtos[modelName as DtoKeys],
          });
        });
      } else {
        routesPushed.push({
          method,
          path,
          modelName: null,
          dto: null,
        });
      }
    }
  });
  return routesPushed;
}

// Fonction pour générer la documentation Swagger
function generateSwaggerDocs() {
  const swaggerDocs = {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  // Générer les chemins et les schémas
  allRoutesInAppSwagger.forEach((route) => {
    const resultListRoutes = listRouterRoutes(route);

    resultListRoutes.forEach((currentRouteForSwagger) => {
      const modelName = currentRouteForSwagger.modelName;
      const dto = currentRouteForSwagger.dto;

      if (modelName) {
        const path = currentRouteForSwagger.path;
        const method = currentRouteForSwagger.method.toLowerCase();

        // Définir le schéma pour la réponse GET
        if (method === 'get') {
          swaggerDocs.paths[path] = {
            ...swaggerDocs.paths[path],
            [method]: {
              summary: `Get all ${modelName}`,
              responses: {
                '200': {
                  description: `List of ${modelName}`,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: { $ref: `#/components/schemas/${modelName}` },
                      },
                    },
                  },
                },
              },
            },
          };
        }

        // Définir le schéma pour POST, PUT, PATCH
        if (['post', 'put', 'patch'].includes(method)) {
          swaggerDocs.paths[path] = {
            ...swaggerDocs.paths[path],
            [method]: {
              summary: `${method.toUpperCase()} ${path}`,
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: `#/components/schemas/${modelName}Create` },
                  },
                },
              },
              responses: {
                '200': {
                  description: `${modelName} updated`,
                  content: {
                    'application/json': {
                      schema: { $ref: `#/components/schemas/${modelName}` },
                    },
                  },
                },
                '201': {
                  description: `${modelName} created`,
                  content: {
                    'application/json': {
                      schema: { $ref: `#/components/schemas/${modelName}` },
                    },
                  },
                },
              },
            },
          };
        }

        // Définir le schéma pour DELETE
        if (method === 'delete') {
          swaggerDocs.paths[path] = {
            ...swaggerDocs.paths[path],
            [method]: {
              summary: `Delete a ${modelName} by ID`,
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'integer' },
                },
              ],
              responses: {
                '200': {
                  description: `${modelName} deleted`,
                },
              },
            },
          };
        }

        // Ajouter les schémas
        swaggerDocs.components.schemas[`${modelName}Create`] = convertDtoToSchema(createDtos[modelName as DtoKeys]);
        swaggerDocs.components.schemas[modelName] = convertDtoToSchema(dtos[modelName as DtoKeys]);
      }
    });
  });

  // Assurez-vous que le dossier swaggerDocs existe
  if (!existsSync(SWAGGER_DOCS_PATH())) {
    mkdirSync(SWAGGER_DOCS_PATH());
  }

  // Écrire le fichier Swagger
  writeFileSync(SWAGGER_DOCS_PATH(['swagger-docs.json']), JSON.stringify(swaggerDocs, null, 2), 'utf8');

  console.log('Swagger documentation generated successfully.');
}

// Générer les fichiers Swagger
generateSwaggerDocs();
