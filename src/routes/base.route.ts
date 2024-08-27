import { NextFunction, Response, Router } from 'express'
import BaseControler from '../controllers/base.controller'
import CreateDtos from '../dtos/createDtos/index'
import Route from '../interfaces/routes.interface'
import validationMiddleware from '../middlewares/validation.middleware'
import DB from '../databases'
import authMiddleware from '../middlewares/auth.middleware'
import { RequestWithUser } from '../interfaces/auth.interface'

class BaseRoute implements Route {
  public path = '/:model'
  public router = Router()
  public static usersTableName = ["users"]
  public static relTables = []
  private activateAuthMiddleware = false
  private checkAuth = (req: RequestWithUser, res: Response, next: NextFunction) => next()

  constructor() {
    this.initializeRoutes()

    if(this.activateAuthMiddleware) this.checkAuth = authMiddleware 
  }

  private initializeRoutes() {
    this.baseCRUD()
  }

  private baseCRUD() {
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