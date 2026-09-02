import Route from '../interfaces/routes.interface';
import { createDtos, dtos, DtoKeys } from '../dtos';
import { convertDtoToSchema } from './convertDtoToSchema';
import { SwaggerDoc } from './swaggerDoc.interface';

export function buildSwaggerDoc(routes: Route[]): SwaggerDoc {
  const swaggerDoc: SwaggerDoc = {
    openapi: '3.0.0',
    info: { title: process.env.API_TITLE || 'API Documentation', version: process.env.API_VERSION || '1.0.0' },
    paths: {},
    components: { schemas: {} },
  };

  routes.forEach(route => {
    route.router.stack?.forEach((middleware: any) => {
      if (!middleware.route) return;
      const method = Object.keys(middleware.route.methods)[0];
      const rawPath: string = middleware.route.path;

      if (rawPath.includes('/:model')) {
        Object.keys(dtos).forEach(modelName => {
          const path = rawPath.replace(':model', modelName);
          addPath(swaggerDoc, path, method, modelName);
        });
      } else {
        const modelName = rawPath.split('/').filter(Boolean)[0] || 'default';
        addPath(swaggerDoc, rawPath, method, modelName);
      }
    });
  });

  return swaggerDoc;
}

function addPath(swaggerDoc: SwaggerDoc, path: string, method: string, modelName: string) {
  const lower = method.toLowerCase();
  swaggerDoc.paths[path] = swaggerDoc.paths[path] || {};
  swaggerDoc.paths[path][lower] = {
    summary: `${method.toUpperCase()} ${path}`,
    tags: [modelName],
    responses: { '200': { description: 'OK' } },
  };

  const dtoKey = modelName as DtoKeys;
  if (dtos[dtoKey]) swaggerDoc.components.schemas[modelName] = convertDtoToSchema(dtos[dtoKey]);
  if (createDtos[dtoKey]) swaggerDoc.components.schemas[`${modelName}Create`] = convertDtoToSchema(createDtos[dtoKey]);
}
