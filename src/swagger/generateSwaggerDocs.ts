// /src/generateSwaggerDocs.ts

import { RouteScannerService } from './services/routeScanner.service';
import { SwaggerGeneratorService } from './services/swaggerGenerator.service';
import { FileWriterService } from './services/fileWriter.service';
import { routes } from '../routes';
import { SwaggerDoc } from './interfaces/swaggerDoc.interface';

export function generateSwaggerDocs() {
  const routesForSwagger = RouteScannerService.scanRoutes(routes);
  const swaggerDoc = SwaggerGeneratorService.generateSwagger(routesForSwagger);

  return swaggerDoc;
}

export function writeSwaggerDocs(swaggerDoc: SwaggerDoc) {
  FileWriterService.writeFile('swagger-docs.json', swaggerDoc);
}


writeSwaggerDocs(generateSwaggerDocs())

console.log("SwaggerDocs generated!")