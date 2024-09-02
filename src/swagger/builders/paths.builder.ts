// /src/builders/paths.builder.ts

import { DtoKeys, dtos, createDtos } from '../../dtos';
import { convertDtoToSchema } from '../services/convertDtoToSchema';
import { RouteForSwagger } from '../interfaces/routeForSwagger.interface';

export class PathsBuilder {
  public static buildPaths(swaggerDoc: any, route: RouteForSwagger): void {
    const { method, path, modelName, dto } = route;

    if (modelName && dto) {
      const lowerMethod = method.toLowerCase();
      const dtoKey = modelName as DtoKeys;

      if (!swaggerDoc.paths[path]) {
        swaggerDoc.paths[path] = {};
      }

      switch (lowerMethod) {
        case 'get':
          swaggerDoc.paths[path][lowerMethod] = this.buildGetPath(modelName);
          break;
        case 'post':
        case 'put':
        case 'patch':
          swaggerDoc.paths[path][lowerMethod] = this.buildMutationPath(modelName, lowerMethod);
          break;
        case 'delete':
          swaggerDoc.paths[path][lowerMethod] = this.buildDeletePath(modelName);
          break;
      }

      swaggerDoc.components.schemas = swaggerDoc.components.schemas || {};
      swaggerDoc.components.schemas[`${modelName}`] = convertDtoToSchema(dtos[dtoKey]);
      swaggerDoc.components.schemas[`${modelName}Create`] = convertDtoToSchema(createDtos[dtoKey]);
    }
  }

  private static buildGetPath(modelName: string): Record<string, any> {
    return {
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
    };
  }

  private static buildMutationPath(modelName: string, method: string): Record<string, any> {
    return {
      summary: `${method.toUpperCase()} ${modelName}`,
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${modelName}Create` },
          },
        },
      },
      responses: {
        '200': {
          description: `${modelName} ${method === 'post' ? 'created' : 'updated'}`,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${modelName}` },
            },
          },
        },
      },
    };
  }

  private static buildDeletePath(modelName: string): Record<string, any> {
    return {
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
    };
  }
}
