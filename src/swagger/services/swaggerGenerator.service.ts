// /services/swaggerGenerator.service.ts

import { PathsBuilder } from '../builders/paths.builder';
import { ComponentsBuilder } from '../builders/components.builder';
import { SwaggerDoc } from '../interfaces/swaggerDoc.interface';
import { RouteForSwagger } from '../interfaces/routeForSwagger.interface';

export class SwaggerGeneratorService {
  public static generateSwagger(routesForSwagger: RouteForSwagger[]): SwaggerDoc {
    const swaggerDoc: SwaggerDoc = {
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

    routesForSwagger.forEach((route) => {
      if (route.modelName) {
        const dto = route.dto;
        if (dto) {
          ComponentsBuilder.buildComponents(swaggerDoc, route.modelName, dto, dto);
          PathsBuilder.buildPaths(swaggerDoc, route);
        }
      }
    });

    return swaggerDoc;
  }
}
