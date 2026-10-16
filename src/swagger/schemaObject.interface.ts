export interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  format?: string;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  description?: string;
  $ref?: string;
}
