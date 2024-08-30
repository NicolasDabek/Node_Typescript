// /services/routeScanner.service.ts

import Route from '../../interfaces/routes.interface';
import { RouteForSwagger } from '../interfaces/routeForSwagger.interface';
import { dtos, DtoKeys } from '../../dtos';

export class RouteScannerService {
  public static scanRoutes(routes: Route[]): RouteForSwagger[] {
    const routesPushed: RouteForSwagger[] = [];

    routes.forEach((route) => {
      route.router.stack?.forEach((middleware) => {
        if (middleware.route) {
          const method = Object.keys(middleware.route["methods"])[0].toUpperCase();
          const path = middleware.route.path;

          // Dynamic model detection
          if (path.includes('/:model')) {
            Object.keys(dtos).forEach((modelName: keyof typeof dtos) => {
              routesPushed.push({
                method: method,
                path: path.replace(':model', modelName),
                modelName,
                dto: dtos[modelName as DtoKeys],
              });
            });
          } else {
            routesPushed.push({
              method: method,
              path,
              modelName: null,
              dto: null,
            });
          }
        }
      });
    });

    return routesPushed;
  }
}