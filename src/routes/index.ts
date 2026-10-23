import fs from 'fs';
import path from 'path';
import Route from '../interfaces/routes.interface';
import BaseRoute from './base.route';

/** Instancie chaque *.route.(ts|js) du dossier (hors base.*), dans l'ordre du dossier. */
export function loadCustomRoutes(dir = __dirname): Route[] {
  const routes: Route[] = [];
  const files = fs.readdirSync(dir).filter(file => {
    const base = path.basename(file);
    return /\.route\.(ts|js)$/.test(base) && !base.startsWith('base.');
  });

  for (const file of files) {
     
    const imported = require(path.join(dir, file));
    const Ctor = imported.default || imported;
    if (typeof Ctor === 'function') {
      routes.push(new Ctor());
    }
  }
  return routes;
}

export const routes: Route[] = [...loadCustomRoutes(), new BaseRoute()];
