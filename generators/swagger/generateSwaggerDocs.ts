// /generators/swagger/generateSwaggerDocs.ts

import { RouteScannerService } from './services/routeScanner.service';
import { SwaggerGeneratorService } from './services/swaggerGenerator.service';
import { FileWriterService } from './services/fileWriter.service';
import { routes } from '../../src/routes';
import { SwaggerDoc } from './interfaces/swaggerDoc.interface';
import { ParametersBuilder } from './builders/parameters.builder';
import Route from '../../src/interfaces/routes.interface';

export function generateSwaggerDocs(routes: Route[]) : SwaggerDoc {
  const routesForSwagger = RouteScannerService.scanRoutes(routes);

  let swaggerDoc = SwaggerGeneratorService.generateSwagger(routesForSwagger);
  swaggerDoc = ParametersBuilder.addParametersToRoutes(swaggerDoc)

  return swaggerDoc;
}

export function writeSwaggerDocs(swaggerDoc: SwaggerDoc): void {
  const baseDoc = {
      openapi: swaggerDoc.openapi,
      info: swaggerDoc.info,
      components: swaggerDoc.components
  };

  for (const modelName in swaggerDoc.paths) {
      if (swaggerDoc.paths.hasOwnProperty(modelName)) {
          const modelDoc = { ...baseDoc, paths: {} };
          modelDoc.paths = swaggerDoc.paths[modelName];

          // Ecrire chaque fichier pour chaque modèle
          const fileName = `swagger-${modelName}.json`;
          FileWriterService.writeFile(fileName, modelDoc);
      }
  }
}

writeSwaggerDocs(generateSwaggerDocs(routes))

console.log("Swagger documentation generated and saved to file!");