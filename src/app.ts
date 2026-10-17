import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import DB from './databases';
import Routes from './interfaces/routes.interface';
import errorMiddleware from './middlewares/error.middleware';
import { logger, stream } from './utils/logger.util';
import session, { Store } from 'express-session';
import { Server } from 'http';
import { buildSwaggerDoc } from './swagger/buildDocs';

export interface AppOptions {
  /**
   * Store des sessions (connect-redis, connect-session-sequelize...). Obligatoire en production
   * si les sessions sont actives : le MemoryStore par défaut fuit la mémoire et ne se partage pas.
   */
  sessionStore?: Store;
}

const csv = (value?: string): string[] => (value || '').split(',').map(s => s.trim()).filter(Boolean);

/** Origines CORS autorisées (CORS_ORIGINS, séparées par des virgules) ; aucune par défaut. */
export const getCorsOrigins = (): string[] => csv(process.env.CORS_ORIGINS);

/** Swagger : actif hors production, ou si SWAGGER_ENABLED vaut explicitement 'true' / 'false'. */
export const isSwaggerEnabled = (env = process.env.NODE_ENV): boolean =>
  process.env.SWAGGER_ENABLED ? process.env.SWAGGER_ENABLED === 'true' : env !== 'production';

/** Sessions actives sauf SESSION_ENABLED=false. */
export const isSessionEnabled = (): boolean => process.env.SESSION_ENABLED !== 'false';

class App {
  public app: express.Application;
  public routes: Routes[];
  public port: string | number;
  public env: string;
  public dbSequelize = DB;
  public static server: Server;

  private options: AppOptions;

  constructor(routes: Routes[], connectDatabase: boolean = true, options: AppOptions = {}) {
    this.options = options;
    this.configApp(routes);
    if (connectDatabase) this.connectToDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  public listen() {
    if (App.server?.listening) {
      logger.info(`Server is already running on port ${this.port}`);
      return;
    }

    App.server = this.app.listen(this.port, () => {
      logger.info(`ENV: ${this.env}`);
      logger.info(`App listening on port ${this.port}`);
    });

    App.server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') logger.error(`Port ${this.port} is already in use`);
      else logger.error(`Server error: ${error.message || error}`);
    });
  }

  private configApp(routes: Routes[]) {
    this.app = express();
    this.routes = routes;
    this.port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    this.env = process.env.NODE_ENV || 'development';
  }

  public async connectToDatabase() {
    await DB.sequelize.authenticate();
    if (process.env.DB_SYNC === 'true') {
      await DB.sequelize.sync({ alter: process.env.DB_SYNC_ALTER === 'true' });
    }
  }

  private initializeMiddlewares() {
    const isProd = this.env === 'production';
    const origins = getCorsOrigins();

    if (process.env.TRUST_PROXY) this.app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
    this.app.use(morgan(isProd ? 'combined' : 'dev', { stream }));
    // Liste blanche explicite : sans CORS_ORIGINS, aucune origine tierce n'est autorisée.
    this.app.use(cors({ origin: origins.length ? origins : false, credentials: true }));
    this.app.use(hpp());
    this.app.use(helmet());
    if (isSessionEnabled()) this.app.use(this.sessionMiddleware(isProd));
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private sessionMiddleware(isProd: boolean) {
    if (isProd && !this.options.sessionStore) {
      throw new Error('Sessions en production : fournissez un store (new App(routes, connect, { sessionStore })) ou désactivez-les avec SESSION_ENABLED=false. Le MemoryStore n\'est pas fait pour la production.');
    }
    return session({
      name: process.env.SESSION_COOKIE_NAME || 'sid',
      secret: process.env.SECRET_SESSION as string,
      store: this.options.sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', secure: isProd },
    });
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use('/', route.router);
    });
  }

  private initializeSwagger() {
    if (!isSwaggerEnabled(this.env)) return;
    const swaggerDoc = buildSwaggerDoc(this.routes);
    this.app.use('/swagger/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
