// /src/generateSwaggerDocs.ts

import { RouteScannerService } from './services/routeScanner.service';
import { SwaggerGeneratorService } from './services/swaggerGenerator.service';
import { FileWriterService } from './services/fileWriter.service';
import { routes } from '../routes';
import { SwaggerDoc } from './interfaces/swaggerDoc.interface';
import { ParametersBuilder } from './builders/parameters.builder';
import Route from '../interfaces/routes.interface';

export function generateSwaggerDocs(routes: Route[]) {
  const routesForSwagger = RouteScannerService.scanRoutes(routes);

  let swaggerDoc = SwaggerGeneratorService.generateSwagger(routesForSwagger);
  swaggerDoc = ParametersBuilder.addParametersToRoutes(swaggerDoc)

  return swaggerDoc;
}

export function writeSwaggerDocs(swaggerDoc: SwaggerDoc) {
  FileWriterService.writeFile('swagger-docs.json', swaggerDoc);
}


writeSwaggerDocs(generateSwaggerDocs(routes))

console.log("Swagger documentation generated and saved to file!");