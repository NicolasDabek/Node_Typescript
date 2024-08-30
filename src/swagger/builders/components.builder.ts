// /src/builders/components.builder.ts

import { SwaggerDoc } from '../interfaces/swaggerDoc.interface';
import { SchemaBuilder } from './schema.builder';

export class ComponentsBuilder {
  public static buildComponents(swaggerDoc: SwaggerDoc, modelName: string, dto: any, createDto: any): void {
    swaggerDoc.components.schemas[`${modelName}Create`] = SchemaBuilder.convertDtoToSchema(createDto);
    swaggerDoc.components.schemas[modelName] = SchemaBuilder.convertDtoToSchema(dto);
  }
}