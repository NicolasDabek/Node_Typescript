// /src/swagger/services/convertDtoToSchema.ts

import { SchemaObject } from '../interfaces/schemaObject.interface';
import { getMetadataStorage } from 'class-validator';

export function convertDtoToSchema(dtoClass: any): SchemaObject {
  const swaggerSchema: SchemaObject = {
    type: 'object',
    properties: {},
    required: [],
  };

  const metadata = getMetadataStorage().getTargetValidationMetadatas(dtoClass, '', false, false);

  metadata.forEach((meta) => {
    const { propertyName, constraints } = meta;

    if (!swaggerSchema.properties![propertyName]) {
      swaggerSchema.properties![propertyName] = { type: 'string' };
    }

    // Handling different types of validations
    switch (meta.constraintCls.name) {
      case 'IsString':
        swaggerSchema.properties![propertyName].type = 'string';
        break;
      case 'IsEmail':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'email';
        break;
      case 'IsNumber':
        swaggerSchema.properties![propertyName].type = 'integer';
        break;
      case 'IsDate':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'date-time';
        break;
      case 'IsBoolean':
        swaggerSchema.properties![propertyName].type = 'boolean';
        break;
      case 'IsUUID':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'uuid';
        break;
      case 'IsArray':
        swaggerSchema.properties![propertyName].type = 'array';
        swaggerSchema.properties![propertyName].items = { type: 'string' }; // default to string array
        break;
      case 'IsUrl':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'url';
        break;
      case 'IsEnum':
        swaggerSchema.properties![propertyName].enum = constraints;
        break;
      case 'IsOptional':
        // Remove from required if it's optional
        const index = swaggerSchema.required!.indexOf(propertyName);
        if (index > -1) {
          swaggerSchema.required!.splice(index, 1);
        }
        break;
      case 'Length':
        if (constraints[0] !== undefined) {
          swaggerSchema.properties![propertyName].minLength = constraints[0];
        }
        if (constraints[1] !== undefined) {
          swaggerSchema.properties![propertyName].maxLength = constraints[1];
        }
        break;
      case 'Min':
        swaggerSchema.properties![propertyName].minimum = constraints[0];
        break;
      case 'Max':
        swaggerSchema.properties![propertyName].maximum = constraints[0];
        break;
      case 'IsNotEmpty':
        if (!swaggerSchema.required!.includes(propertyName)) {
          swaggerSchema.required!.push(propertyName);
        }
        break;
      case 'IsPositive':
        swaggerSchema.properties![propertyName].minimum = 1;
        break;
      case 'IsNegative':
        swaggerSchema.properties![propertyName].maximum = -1;
        break;
      case 'MinLength':
        swaggerSchema.properties![propertyName].minLength = constraints[0];
        break;
      case 'MaxLength':
        swaggerSchema.properties![propertyName].maxLength = constraints[0];
        break;
      case 'Matches':
        swaggerSchema.properties![propertyName].pattern = constraints[0].toString();
        break;
      case 'IsISO8601':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'date-time';
        break;
      case 'IsIn':
        swaggerSchema.properties![propertyName].enum = constraints;
        break;
    }
  });

  return swaggerSchema;
}