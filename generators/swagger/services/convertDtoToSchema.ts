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
    switch (meta.name) {
      case 'isString':
        swaggerSchema.properties![propertyName].type = 'string';
        break;
      case 'isEmail':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'email';
        break;
      case 'isNumber':
        swaggerSchema.properties![propertyName].type = 'integer';
        break;
      case 'isDate':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'date-time';
        break;
      case 'isBoolean':
        swaggerSchema.properties![propertyName].type = 'boolean';
        break;
      case 'isUUID':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'uuid';
        break;
      case 'isArray':
        swaggerSchema.properties![propertyName].type = 'array';
        swaggerSchema.properties![propertyName].items = { type: 'string' }; // default to string array
        break;
      case 'isUrl':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'url';
        break;
      case 'isEnum':
        swaggerSchema.properties![propertyName].enum = constraints;
        break;
      case 'isOptional':
        // Remove from required if it's optional
        const index = swaggerSchema.required!.indexOf(propertyName);
        if (index > -1) {
          swaggerSchema.required!.splice(index, 1);
        }
        break;
      case 'length':
        if (constraints[0] !== undefined) {
          swaggerSchema.properties![propertyName].minLength = constraints[0];
        }
        if (constraints[1] !== undefined) {
          swaggerSchema.properties![propertyName].maxLength = constraints[1];
        }
        break;
      case 'min':
        swaggerSchema.properties![propertyName].minimum = constraints[0];
        break;
      case 'max':
        swaggerSchema.properties![propertyName].maximum = constraints[0];
        break;
      case 'isNotEmpty':
        if (!swaggerSchema.required!.includes(propertyName)) {
          swaggerSchema.required!.push(propertyName);
        }
        break;
      case 'isPositive':
        swaggerSchema.properties![propertyName].minimum = 1;
        break;
      case 'isNegative':
        swaggerSchema.properties![propertyName].maximum = -1;
        break;
      case 'minLength':
        swaggerSchema.properties![propertyName].minLength = constraints[0];
        break;
      case 'maxLength':
        swaggerSchema.properties![propertyName].maxLength = constraints[0];
        break;
      case 'Matches':
        swaggerSchema.properties![propertyName].pattern = constraints[0].toString();
        break;
      case 'isISO8601':
        swaggerSchema.properties![propertyName].type = 'string';
        swaggerSchema.properties![propertyName].format = 'date-time';
        break;
      case 'isIn':
        swaggerSchema.properties![propertyName].enum = constraints;
        break;
    }
  });

  return swaggerSchema;
}