// /src/interfaces/routeForSwagger.interface.ts

import { DtoKeys, dtos } from '../../dtos';
import { SchemaObject } from './schemaObject.interface';

export interface RouteForSwagger {
  method: string;
  path: string;
  modelName: string | keyof typeof dtos | null;
  dto: SchemaObject | typeof dtos[DtoKeys] | null;
}