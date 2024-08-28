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

interface RouteForSwagger {
  method: string;
  path: string;
  dto?: typeof dtos[DtoKeys];
  modelName?: keyof typeof dtos;
}

function listRouterRoutes(routes: Route): RouteForSwagger[] {
  const routesPushed: RouteForSwagger[] = [];
  routes.router.stack?.forEach((middleware) => {
    if (middleware.route) {
      const modelName = (middleware.route.path.match(/\/([^\/]+)/) || [])[1]; // Extract model name
      routesPushed.push({
        method: Object.keys(middleware.route["methods"])[0].toUpperCase(),
        path: middleware.route.path,
        dto: dtos[modelName as DtoKeys],
        modelName: modelName as keyof typeof dtos
      });
    }
  });
  return routesPushed;
}

function convertClassValidatorToSwagger(dtoClass): any {
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

function replaceModelPlaceholder(path: string, modelName: string): string {
  return path.replace('/:model', `/${modelName}`);
}

function generateSwaggerFiles(routes: Route[]) {
  routes.forEach((currentRoute) => {
    // lancé une fois par fichier de route
    console.log("currentRoute.stack", currentRoute["stack"])
    const resultListRoutes = listRouterRoutes(currentRoute);
    resultListRoutes.forEach((currentRouteForSwagger, index) => {
      // lancé autant de fois qu'il y a de routes définies dans un fichier de route
      let parameters = '';

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(currentRouteForSwagger.method) && currentRouteForSwagger.dto) {
        const swaggerSchema = convertClassValidatorToSwagger(currentRouteForSwagger.dto);
        parameters = `requestBody:\n *       content:\n *         application/json:\n *           schema:\n${StringUtil.addCharacterToEachLine(JSON.stringify(swaggerSchema, null, 2), '\u00A0*')}`;
      }

      const pathWithModel = currentRouteForSwagger.modelName ? replaceModelPlaceholder(currentRouteForSwagger.path, currentRouteForSwagger.modelName) : currentRouteForSwagger.path;

      const docContent = `
/**
 * @swagger
 * ${pathWithModel}:
 *   ${currentRouteForSwagger.method.toLowerCase()}:
 *     summary: ${currentRouteForSwagger.method} ${pathWithModel}
 *     ${parameters}
 *     responses:
 *       200:
 *         description: Success
 */
    `;

      const filePath = join(__dirname, '../swaggerDocs', `route${index + 1}.js`);
      writeFileSync(filePath, docContent, 'utf8');
    });
  });
}

if (!existsSync(join(__dirname, '../swaggerDocs'))) {
  mkdirSync(join(__dirname, '../swaggerDocs'));
}

generateSwaggerFiles(router);

console.log('Swagger documentation generated successfully.');