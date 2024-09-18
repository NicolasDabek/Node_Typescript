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
  public routes: Routes[]
  public port: string | number;
  public env: string;
  public dbSequelize = DB;
  public static server: Server;

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
    if (App.server?.listening) {
      console.log(`Server is already running on port ${this.port}`);
      return;
    }

    App.server = this.app.listen(this.port, () => {
      logger.info(`ENV: ${this.env}`);
      logger.info(`App listening on port ${this.port}`);
    });

    App.server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${this.port} is already in use`);
      } else {
        console.error(`Server error: ${error}`);
      }
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
    const swaggerDocsDir = path.resolve(__dirname, 'swaggerDocs');
    const swaggerDoc: SwaggerDoc = {
        openapi: '3.0.0',
        info: { title: 'My API', version: '1.0.0' },
        paths: {},
        components: { schemas: {} },
    };

    // Vérifier si le dossier existe
    if (fs.existsSync(swaggerDocsDir)) {
        const files = fs.readdirSync(swaggerDocsDir);
        
        // Boucle sur tous les fichiers JSON dans le dossier swaggerDocs
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const modelDocPath = path.join(swaggerDocsDir, file);
                const modelDoc = JSON.parse(fs.readFileSync(modelDocPath, 'utf8'));

                // Combiner les paths et components des modèles dans un seul objet
                swaggerDoc.paths = { ...swaggerDoc.paths, ...modelDoc.paths };
                swaggerDoc.components.schemas = { ...swaggerDoc.components.schemas, ...modelDoc.components.schemas };
            }
        });

        // Configuration de Swagger UI avec le document combiné
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