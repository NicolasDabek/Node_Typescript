// /src/interfaces/swaggerDoc.interface.ts

import { SchemaObject } from './schemaObject.interface';

export interface SwaggerDoc {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, any>;
  components: {
    schemas: Record<string, SchemaObject>;
  };
}