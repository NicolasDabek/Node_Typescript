import { NextFunction, Response, Router } from 'express'
import BaseControler from '../controllers/base.controller'
import Route from '../interfaces/routes.interface'
import validationMiddleware from '../middlewares/validation.middleware'
import authMiddleware from '../middlewares/auth.middleware'
import { RequestWithUser } from '../interfaces/auth.interface'

class BaseRoute implements Route {
  public path = '/:model'
  public router = Router()
  // Used in BaseService.createData()
  public static userTableName = "users"
  // Used in BaseService.createData()
  public static fieldNameUserPassword = process.env.FIELD_NAME_USER_PASSWORD
  public static relTables = []
  private activateAuthMiddleware = false
  private checkAuth = (req: RequestWithUser, res: Response, next: NextFunction) => next()

  constructor() {
    if(this.activateAuthMiddleware) this.checkAuth = authMiddleware

    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, this.checkAuth, BaseControler.getAllDatas)
    this.router.get(`${this.path}/:id(\\d+)`, this.checkAuth, BaseControler.getDataById)
    this.router.get(`${this.path}/onefield/:fieldName`, this.checkAuth, BaseControler.getAllDataOneField)
    this.router.get(`${this.path}/multiple/:fieldName/:fieldVal`, this.checkAuth, BaseControler.getMultipleByFieldVal)
    this.router.post(`${this.path}`, this.checkAuth, validationMiddleware(), BaseControler.createData)
    this.router.put(`${this.path}/:id(\\d+)`, this.checkAuth, validationMiddleware('body', true), BaseControler.updateData)
    this.router.delete(`${this.path}/:id(\\d+)`, this.checkAuth, BaseControler.deleteData)
  }
}

export default BaseRoute