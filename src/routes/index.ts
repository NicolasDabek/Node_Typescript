import fs from 'fs';
import path from 'path';
import Route from '../interfaces/routes.interface';
import BaseRoute from './base.route';

function loadCustomRoutes(): Route[] {
  const routes: Route[] = [];
  const files = fs.readdirSync(__dirname).filter(file => {
    const base = path.basename(file);
    return /\.route\.(ts|js)$/.test(base) && !base.startsWith('base.');
  });

  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require(path.join(__dirname, file));
    const Ctor = imported.default || imported;
    if (typeof Ctor === 'function') {
      routes.push(new Ctor());
    }
  }
  return routes;
}

export const routes: Route[] = [...loadCustomRoutes(), new BaseRoute()];
