process.env['NODE_CONFIG_DIR'] = __dirname + '/config';

import 'dotenv/config';
import App from './app';
import { validateEnv } from './utils/validateEnv.util'
import { routes } from './routes'

validateEnv()

export const app = new App(routes)

app.listen()

listRoutes(app)
function listRoutes(app: App) {
  app.routes.forEach((currentRoute) => {
    currentRoute.router.stack.forEach((middleware: any) => {
    if (middleware.route) { // si c'est une route
      console.log(`Route: ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') { // si c'est un routeur
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          console.log(`Route: ${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`);
        }
      });
    }
  });
  })
}