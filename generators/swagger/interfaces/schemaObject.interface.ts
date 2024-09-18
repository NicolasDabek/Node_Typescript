// /src/interfaces/schemaObject.interface.ts

export interface SchemaObject {
  type: string;
  properties: Record<string, any>;
  required: string[];
  format?: string;
  example?: any;
  items?: any; // for array type
  enum?: any[];
}