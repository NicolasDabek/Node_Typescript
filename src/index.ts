import path from 'path';
process.env['NODE_CONFIG_DIR'] = path.resolve(process.cwd(), 'config');

import 'dotenv/config';
import App from './app';
import { validateEnv } from './utils/validateEnv.util';
import { routes } from './routes';

validateEnv();

export const app = new App(routes, false);

(async () => {
  if (process.env.NODE_ENV !== 'test') {
    await app.connectToDatabase();
    app.listen();
  }
})();
