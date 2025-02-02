import { NextFunction, Response, Router } from 'express'
import BaseControler from '../controllers/base.controller'
import Route from '../interfaces/routes.interface'
import validationMiddleware from '../middlewares/validation.middleware'
import authMiddleware from '../middlewares/auth.middleware'
import { RequestWithUser } from '../interfaces/auth.interface'
import DB from '../databases'
import { ClassUtil } from '../utils/class.util'
import { Model } from 'sequelize'

class BaseRoute implements Route {
  public path = '/:model';
  public router = Router();
  public static userModel = DB.Models.users;
  public static userModelName = ClassUtil.getClassName(this.userModel);
  public static fieldNameUsername = 'username';
  public static fieldNameUserPassword = 'password';
  public static relTables = [];
  private activateAuthMiddleware = false;
  private checkAuth = (req: RequestWithUser<Model>, res: Response, next: NextFunction) => next();

  constructor() {
    if(this.activateAuthMiddleware) this.checkAuth = authMiddleware;

    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.checkAuth, BaseControler.getAllDatas);
    this.router.get(`${this.path}/:id(\\d+)`, this.checkAuth, BaseControler.getDataById);
    this.router.get(`${this.path}/onefield/:fieldName`, this.checkAuth, BaseControler.getAllDataOneField);
    this.router.get(`${this.path}/multiple/:fieldName/:fieldVal`, this.checkAuth, BaseControler.getMultipleByFieldVal);
    this.router.post(`${this.path}`, this.checkAuth, validationMiddleware(), BaseControler.createData);
    this.router.put(`${this.path}/:id(\\d+)`, this.checkAuth, validationMiddleware('body', true), BaseControler.updateData);
    this.router.delete(`${this.path}/:id(\\d+)`, this.checkAuth, BaseControler.deleteData);
  }
}

export default BaseRoute