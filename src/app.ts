import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import DB from './databases';
import Routes from './interfaces/routes.interface';
import errorMiddleware from './middlewares/error.middleware';
import { logger, stream } from './utils/logger.util';
import csurf from "csurf"
import session from "express-session"
import { Server } from 'http';
import path from 'path';
import fs from "fs"

class App {
  public app: express.Application;
  public routes: Routes[]
  public port: string | number;
  public env: string;
  public dbSequelize = DB
  public server: Server

  constructor(routes: Routes[], generateSwaggerDocs: boolean = false) {
    this.app = express();
    this.routes = routes;
    this.port = process.env.PORT || 3000;
    this.env = process.env.NODE_ENV || 'development';

    if(!generateSwaggerDocs) {
      this.connectToDatabase();
    }

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
    this.initializeSwagger();
    this.initializeErrorHandling();
    
  }

  public listen() {
    this.server = this.app.listen(this.port, () => {
      logger.info(`ENV: ${this.env}`);
      logger.info(`App listening on port ${this.port}`);
    });
  }

  public getServer() {
    return this.app;
  }

  private connectToDatabase() {
    DB.sequelize.sync({ force: false });
  }

  private initializeMiddlewares() {
    if (process.env.NODE_ENV === 'production') {
      this.app.use(morgan('combined', { stream }))
      this.app.use(cors({ origin: process.env.DOMAIN_NAME, credentials: true }))
    } else {
      this.app.use(morgan('dev', { stream }))
      this.app.use(cors({ origin: true, credentials: true }))
    }
  
    this.app.use(hpp())
    this.app.use(helmet())
    this.app.use(session({
      secret: "mysecret",
      resave: true,
      saveUninitialized: true
    }))
    this.app.use(compression())
    //this.app.use(csurf())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))
    this.app.use(cookieParser())
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use("/", route.router);
    });
  }

  private initializeSwagger() {
    const swaggerPath = path.resolve(__dirname, 'swaggerDocs', 'swagger-docs.json');
    
    if (fs.existsSync(swaggerPath)) {
      const swaggerDoc = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));
      this.app.use('/swagger/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    } else {
      logger.error('Swagger document not found. Please ensure the file exists at the specified path.');
    }
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;