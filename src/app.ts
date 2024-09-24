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
import session from "express-session"
import { Server } from 'http';
import path from 'path';
import fs from "fs"
import { SwaggerDoc } from '../generators/swagger/interfaces/swaggerDoc.interface';

class App {
  public app: express.Application;
  public routes: Routes[];
  public port: string | number;
  public env: string;
  public dbSequelize = DB;
  public static server: Server;

  constructor(routes: Routes[], connectDatabase: boolean = true) {
    this.configApp(routes);

    if (connectDatabase) {
      this.connectToDatabase();
    }

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  public listen() {
    if (App.server?.listening) {
      console.log(`Server is already running on port ${this.port}`);
      return;
    }

    try {
      App.server = this.app.listen(this.port, () => {
        logger.info(`ENV: ${this.env}`);
        logger.info(`App listening on port ${this.port}`);
      });
    } catch (error: any) {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${this.port} is already in use`);
      } else {
        logger.error(`Server error: ${error.message || error}`);
      }
    }
  }

  private configApp(routes: Routes[]) {
    this.app = express();
    this.routes = routes;
    this.port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    this.env = process.env.NODE_ENV || 'development';
  }

  private connectToDatabase() {
    DB.sequelize.sync({ force: false });
  }

  private initializeMiddlewares() {
    // Gestion des logs et du CORS en fonction de l'environnement
    const morganFormat = this.env === 'production' ? 'combined' : 'dev';
    const corsOptions = {
      origin: this.env === 'production' ? process.env.DOMAIN_NAME : true,
      credentials: true,
    };

    this.app.use(morgan(morganFormat, { stream }));
    this.app.use(cors(corsOptions));

    // Middlewares de sécurité et utilitaires
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(session({
      secret: process.env.SECRET_SESSION || "mysecret",
      resave: true,
      saveUninitialized: true
    }));
    this.app.use(compression());
    // this.app.use(csurf());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use("/", route.router);
    });
  }

  private initializeSwagger() {
    const swaggerDocsDir = path.resolve(__dirname, 'swaggerDocs');
    const swaggerDoc: SwaggerDoc = {
      openapi: '3.0.0',
      info: { title: 'My API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    if (fs.existsSync(swaggerDocsDir)) {
      const files = fs.readdirSync(swaggerDocsDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const modelDocPath = path.join(swaggerDocsDir, file);
          const modelDoc = JSON.parse(fs.readFileSync(modelDocPath, 'utf8'));

          swaggerDoc.paths = { ...swaggerDoc.paths, ...modelDoc.paths };
          swaggerDoc.components.schemas = { ...swaggerDoc.components.schemas, ...modelDoc.components.schemas };
        }
      });

      this.app.use('/swagger/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    } else {
      logger.error('Swagger documentation directory not found. Please ensure the directory exists.');
    }
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;