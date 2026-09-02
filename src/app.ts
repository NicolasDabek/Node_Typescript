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
import session from 'express-session';
import { Server } from 'http';
import { buildSwaggerDoc } from './swagger/buildDocs';

class App {
  public app: express.Application;
  public routes: Routes[];
  public port: string | number;
  public env: string;
  public dbSequelize = DB;
  public static server: Server;

  constructor(routes: Routes[], connectDatabase: boolean = true) {
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
    const morganFormat = this.env === 'production' ? 'combined' : 'dev';
    const corsOptions = {
      origin: this.env === 'production' ? process.env.DOMAIN_NAME : true,
      credentials: true,
    };

    this.app.use(morgan(morganFormat, { stream }));
    this.app.use(cors(corsOptions));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(session({
      secret: process.env.SECRET_SESSION || 'change-me-in-production',
      resave: false,
      saveUninitialized: false,
    }));
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use('/', route.router);
    });
  }

  private initializeSwagger() {
    const swaggerDoc = buildSwaggerDoc(this.routes);
    this.app.use('/swagger/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
