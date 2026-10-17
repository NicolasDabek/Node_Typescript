import { NextFunction, Request, Response, Router } from 'express';
import BaseController from '../controllers/base.controller';
import Route from '../interfaces/routes.interface';
import validationMiddleware from '../middlewares/validation.middleware';
import authMiddleware from '../middlewares/auth.middleware';
import { RequestWithUser } from '../interfaces/auth.interface';
import DB from '../databases';
import { Model } from 'sequelize';
import { assertCrudAccess, requiresAuth } from '../crud/registry';
import { CrudOperation } from '../crud/crud.interface';

/**
 * CRUD générique sur /:model pour tout modèle Sequelize exposé.
 * Accès, opérations, auth et hooks par modèle : voir src/crud/registry.ts et src/crud/overrides.
 */
class BaseRoute implements Route {
  public path = '/:model';
  public router = Router();
  public static userModel = DB.Models.users;
  public static userModelName = 'users';
  public static fieldNameUsername = 'username';
  public static fieldNameUserPassword = 'password';
  public static relTables: string[] = [];

  constructor() {
    this.initializeRoutes();
  }

  /** Vérifie l'accès (403 avant toute validation) puis exige un JWT (par défaut ; voir requiresAuth). */
  private guard = (operation: CrudOperation) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = assertCrudAccess(req.params.model, operation);
      if (requiresAuth(config, operation)) return authMiddleware(req as RequestWithUser<Model>, res, next);
      next();
    } catch (error) {
      next(error);
    }
  };

  private initializeRoutes() {
    const p = this.path;
    this.router.get(p, this.guard('list'), BaseController.getAllDatas);
    this.router.get(`${p}/:id(\\d+)`, this.guard('read'), BaseController.getDataById);
    this.router.get(`${p}/onefield/:fieldName`, this.guard('field'), BaseController.getAllDataOneField);
    this.router.get(`${p}/multiple/:fieldName/:fieldVal`, this.guard('search'), BaseController.getMultipleByFieldVal);
    this.router.post(p, this.guard('create'), validationMiddleware(), BaseController.createData);
    this.router.put(`${p}/:id(\\d+)`, this.guard('update'), validationMiddleware('body', true), BaseController.updateData);
    this.router.delete(`${p}/:id(\\d+)`, this.guard('delete'), BaseController.deleteData);
  }
}

export default BaseRoute;
