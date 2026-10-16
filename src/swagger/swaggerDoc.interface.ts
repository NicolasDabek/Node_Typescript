import { SchemaObject } from './schemaObject.interface';

export interface SwaggerDoc {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, Record<string, unknown>>;
  tags?: { name: string; description?: string }[];
  components: {
    schemas: Record<string, SchemaObject>;
    securitySchemes?: Record<string, unknown>;
    responses?: Record<string, unknown>;
  };
}
