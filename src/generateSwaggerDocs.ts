import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getMetadataStorage } from 'class-validator';
import { UsersDto } from './dtos/user.dto';
import BaseRoute from './routes/base.route';
import App from './app';
import Route from '@interfaces/routes.interface';
import { StringUtil } from '@utils/string.util';

export const appForSwagger = new App([new BaseRoute()], true)
const router: Route[] = appForSwagger.routes;

interface RouteForSwagger {
  method: string,
  path: string,
  dto?: typeof UsersDto
}

// Fonction pour lister les routes d'un routeur spécifique
function listRouterRoutes(routes: Route) {
  const routesPushed: RouteForSwagger[] = [];
  routes.router.stack?.forEach((middleware) => {
    if (middleware.route) {
      console.log("middleware", middleware)
      routesPushed.push({
        method: Object.keys(middleware.route["methods"])[0].toUpperCase(),
        path: middleware.route.path,
        dto: UsersDto
      });
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
  routes.forEach((currentRoute) => {
    const resultListRoutes = listRouterRoutes(currentRoute);
    console.log("routes", routes)
    resultListRoutes.forEach((currentRouteForSwagger, index) => {
      let parameters = '';

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(currentRouteForSwagger.method) && currentRouteForSwagger.dto) {
        const swaggerSchema = convertClassValidatorToSwagger(currentRouteForSwagger.dto);
        parameters = `requestBody:\n *       content:\n *         application/json:\n *           schema:\n${StringUtil.addCharacterToEachLine(JSON.stringify(swaggerSchema, null, 2), '\u00A0*')}`;
      }

      const docContent = `
/**
 * @swagger
 * /${currentRouteForSwagger.path}:
 *   ${currentRouteForSwagger.method.toLowerCase()}:
 *     summary: ${currentRouteForSwagger.method} ${currentRouteForSwagger.path}
 *     ${parameters}
 *     responses:
 *       200:
 *         description: Success
 */
    `;

      // Écrire le fichier dans le dossier swaggerDocs
      const filePath = join(__dirname, '../swaggerDocs', `route${index + 1}.js`);
      writeFileSync(filePath, docContent, 'utf8');
    });
  })

}

// Assurez-vous que le dossier swaggerDocs existe
if (!existsSync(join(__dirname, '../swaggerDocs'))) {
  mkdirSync(join(__dirname, '../swaggerDocs'));
}

// Générer les fichiers
generateSwaggerFiles(router);

console.log('Swagger documentation generated successfully.');
