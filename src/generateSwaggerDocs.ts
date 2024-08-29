import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getMetadataStorage } from 'class-validator';
import { dtos, DtoKeys } from './dtos';
import BaseRoute from './routes/base.route';
import App from './app';
import Route from './interfaces/routes.interface';
import { StringUtil } from './utils/string.util';

const allRoutesList = [new BaseRoute()]
export const appForSwagger = new App(allRoutesList, true);
const router: Route[] = appForSwagger.routes;
const SWAGGER_DOCS_PATH = join(__dirname, '../../swaggerDocs');

interface RouteForSwagger {
  method: string;
  path: string;
  dto?: typeof dtos[DtoKeys];
  modelName?: keyof typeof dtos;
}

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

// Fonction pour convertir les règles class-validator en spécifications Swagger
function convertClassValidatorToSwagger(dtoClass) {
  const swaggerSchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  const metadata = getMetadataStorage().getTargetValidationMetadatas(dtoClass, '', false, false);

  const groupedMetadata = metadata.reduce((acc, meta) => {
    if (!acc[meta.propertyName]) {
      acc[meta.propertyName] = [];
    }
    acc[meta.propertyName].push(meta);
    return acc;
  }, {});

  for (const property in groupedMetadata) {
    const constraints = groupedMetadata[property];
    swaggerSchema.properties[property] = {};

    constraints.forEach((constraint) => {
      switch (constraint.constraintCls.name) {
        case 'IsString':
          swaggerSchema.properties[property].type = 'string';
          break;
        case 'IsEmail':
          swaggerSchema.properties[property].format = 'email';
          break;
        case 'Length':
          swaggerSchema.properties[property].minLength = constraint.constraints[0];
          if (constraint.constraints[1] !== undefined) {
            swaggerSchema.properties[property].maxLength = constraint.constraints[1];
          }
          break;
      }

      if (constraint.constraintCls.name === 'Length' && constraint.constraints[0] > 0) {
        swaggerSchema.required.push(property);
      }
    });

    if (!swaggerSchema.properties[property].type) {
      swaggerSchema.properties[property].type = 'string';
    }
  }

  return swaggerSchema;
}

// Générer des fichiers de documentation Swagger en JavaScript
function generateSwaggerFiles(routes: Route[]) {
  const modelRoutes = new Map<string, string[]>();

  // Regrouper les routes par modèle
  routes.forEach((currentRoute) => {
    const resultListRoutes = listRouterRoutes(currentRoute);

    resultListRoutes.forEach((currentRouteForSwagger) => {
      if (currentRouteForSwagger.modelName) {
        const docContent = `
/**
 * @swagger
 * ${currentRouteForSwagger.path}:
 *   ${currentRouteForSwagger.method.toLowerCase()}:
 *     summary: ${currentRouteForSwagger.method} ${currentRouteForSwagger.path}
 *     ${currentRouteForSwagger.dto ? `requestBody:
 *       content:
 *         application/json:
 *           schema:
 * ${StringUtil.addCharacterToEachLine(JSON.stringify(convertClassValidatorToSwagger(currentRouteForSwagger.dto), null, 2), '\u00A0*')}` : ''}
 *     responses:
 *       200:
 *         description: Success
 */
`;

        if (!modelRoutes.has(currentRouteForSwagger.modelName)) {
          modelRoutes.set(currentRouteForSwagger.modelName, []);
        }
        modelRoutes.get(currentRouteForSwagger.modelName)?.push(docContent);
      }
    });
  });

  // Écrire les fichiers dans le dossier swaggerDocs
  modelRoutes.forEach((contents, modelName) => {
    const filePath = join(SWAGGER_DOCS_PATH, `${modelName}.js`);
    writeFileSync(filePath, contents.join('\n'), 'utf8');
  });
}

// Assurez-vous que le dossier swaggerDocs existe
if (!existsSync(SWAGGER_DOCS_PATH)) {
  mkdirSync(SWAGGER_DOCS_PATH);
}

// Générer les fichiers
generateSwaggerFiles(router);

console.log('Swagger documentation generated successfully.');
