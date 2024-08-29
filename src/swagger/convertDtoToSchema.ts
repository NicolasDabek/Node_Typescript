// src/swagger/convertDtoToSchema.ts

import { getMetadataStorage } from 'class-validator';

interface SchemaObject {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  format?: string;
  example?: any;
}

export function convertDtoToSchema(dtoClass: any): SchemaObject {
  const swaggerSchema: SchemaObject = {
    type: 'object',
    properties: {},
    required: [],
  };

  const metadata = getMetadataStorage().getTargetValidationMetadatas(dtoClass, '', false, false);

  metadata.forEach((meta) => {
    const { propertyName, constraints } = meta;

    if (!swaggerSchema.properties[propertyName]) {
      swaggerSchema.properties[propertyName] = { type: 'string' };
    }

    // Example of how to handle different types of validations
    switch (meta.constraintCls.name) {
      case 'IsString':
        swaggerSchema.properties[propertyName].type = 'string';
        break;
      case 'IsEmail':
        swaggerSchema.properties[propertyName].type = 'string';
        swaggerSchema.properties[propertyName].format = 'email';
        break;
      case 'IsNumber':
        swaggerSchema.properties[propertyName].type = 'integer';
        break;
      case 'IsDate':
        swaggerSchema.properties[propertyName].type = 'string';
        swaggerSchema.properties[propertyName].format = 'date-time';
        break;
    }

    // Ensure constraints is defined and is an array
    if (Array.isArray(constraints)) {
      if (meta.constraintCls.name === 'Length') {
        if (constraints[0] !== undefined) {
          swaggerSchema.properties[propertyName].minLength = constraints[0];
        }
        if (constraints[1] !== undefined) {
          swaggerSchema.properties[propertyName].maxLength = constraints[1];
        }
      }
    }

    // Add to required if there are validation constraints like @IsNotEmpty
    if (meta.constraintCls.name === 'IsNotEmpty') {
      swaggerSchema.required.push(propertyName);
    }
  });

  return swaggerSchema;
}
