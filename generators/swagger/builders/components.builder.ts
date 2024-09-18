// /src/builders/components.builder.ts

import { SwaggerDoc } from '../interfaces/swaggerDoc.interface';
import { SchemaBuilder } from './schema.builder';

export class ComponentsBuilder {
  public static buildComponents(swaggerDoc: SwaggerDoc, modelName: string, dto: any, createDto: any): void {
    swaggerDoc.components.schemas[`${modelName}Create`] = SchemaBuilder.convertDtoToSchema(createDto);
    swaggerDoc.components.schemas[modelName] = SchemaBuilder.convertDtoToSchema(dto);

    // Ajout des schémas d'erreurs
    swaggerDoc.components.schemas['ErrorResponse400'] = {
      type: 'object',
      properties: {
        status: { type: 'integer', example: 400 },
        error: { type: 'string', example: 'Bad Request' },
        message: { type: 'string', example: "The 'email' field is required." },
        details: {
          type: 'object',
          properties: {
            field: { type: 'string', example: 'email' },
            issue: { type: 'string', example: 'missing' }
          }
        }
      }
    };

    swaggerDoc.components.schemas['ErrorResponse401'] = {
      type: 'object',
      properties: {
        status: { type: 'integer', example: 401 },
        error: { type: 'string', example: 'Unauthorized' },
        message: { type: 'string', example: 'Invalid authentication token. Please log in.' }
      }
    };

    swaggerDoc.components.schemas['ErrorResponse403'] = {
      type: 'object',
      properties: {
        status: { type: 'integer', example: 403 },
        error: { type: 'string', example: 'Forbidden' },
        message: { type: 'string', example: 'You do not have permission to perform this action.' }
      }
    };

    swaggerDoc.components.schemas['ErrorResponse404'] = {
      type: 'object',
      properties: {
        status: { type: 'integer', example: 404 },
        error: { type: 'string', example: 'Not Found' },
        message: { type: 'string', example: 'The requested resource was not found.' }
      }
    };

    swaggerDoc.components.schemas['ErrorResponse409'] = {
      type: 'object',
      properties: {
        status: { type: 'integer', example: 409 },
        error: { type: 'string', example: 'Conflict' },
        message: { type: 'string', example: 'A user with this email already exists.' }
      }
    };

    swaggerDoc.components.schemas['ErrorResponse422'] = {
      type: 'object',
      properties: {
        status: { type: 'integer', example: 422 },
        error: { type: 'string', example: 'Unprocessable Entity' },
        message: { type: 'string', example: 'Validation failed for one or more fields.' },
        details: {
          type: 'object',
          properties: {
            field: { type: 'string', example: 'password' },
            issue: { type: 'string', example: 'too_short' },
            minimum_length: { type: 'integer', example: 8 }
          }
        }
      }
    };

    swaggerDoc.components.schemas['ErrorResponse500'] = {
      type: 'object',
      properties: {
        status: { type: 'integer', example: 500 },
        error: { type: 'string', example: 'Internal Server Error' },
        message: { type: 'string', example: 'An unexpected error occurred. Please try again later.' }
      }
    };

    swaggerDoc.components.schemas['ErrorResponse503'] = {
      type: 'object',
      properties: {
        status: { type: 'integer', example: 503 },
        error: { type: 'string', example: 'Service Unavailable' },
        message: { type: 'string', example: 'The server is currently unavailable. Please try again later.' }
      }
    };
  }
}