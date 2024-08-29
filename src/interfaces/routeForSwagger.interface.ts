import { dtos, DtoKeys } from '../dtos';

export interface RouteForSwagger {
  method: string;
  path: string;
  dto?: typeof dtos[DtoKeys];
  modelName?: keyof typeof dtos;
}