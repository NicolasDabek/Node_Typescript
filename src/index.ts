process.env['NODE_CONFIG_DIR'] = __dirname + '/config';

import 'dotenv/config';
import App from './app';
import { validateEnv } from './utils/validateEnv.util'
import { routes } from './routes'

validateEnv()

export const app = new App(routes)

app.listen()