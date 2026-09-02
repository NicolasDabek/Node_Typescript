import { SchemaObject } from './schemaObject.interface';
import { getMetadataStorage } from 'class-validator';

export function convertDtoToSchema(dtoClass: any): SchemaObject {
  const swaggerSchema: SchemaObject = { type: 'object', properties: {}, required: [] };
  const metadata = getMetadataStorage().getTargetValidationMetadatas(dtoClass, '', false, false);
  metadata.forEach((meta) => {
    const { propertyName } = meta;
    if (!swaggerSchema.properties![propertyName]) swaggerSchema.properties![propertyName] = { type: 'string' };
    switch (meta.name) {
      case 'isString': swaggerSchema.properties![propertyName].type = 'string'; break;
      case 'isEmail': swaggerSchema.properties![propertyName].type = 'string'; swaggerSchema.properties![propertyName].format = 'email'; break;
      case 'isNumber': swaggerSchema.properties![propertyName].type = 'integer'; break;
      case 'isDate': swaggerSchema.properties![propertyName].type = 'string'; swaggerSchema.properties![propertyName].format = 'date-time'; break;
      case 'isBoolean': swaggerSchema.properties![propertyName].type = 'boolean'; break;
    }
  });
  return swaggerSchema;
}
