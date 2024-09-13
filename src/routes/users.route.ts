import { Router } from 'express'
import UsersControler from '../controllers/users.controller'
import Route from '../interfaces/routes.interface'
import validationMiddleware from '../middlewares/validation.middleware'

class UsersRoute implements Route {
  public path = '/users'
  public router = Router()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(`${this.path}`, validationMiddleware(), UsersControler.registerUser)
  }
}

export default UsersRoute