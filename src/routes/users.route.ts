import { Router } from 'express'
import Route from '../interfaces/routes.interface'
import validationMiddleware from '../middlewares/validation.middleware'
import UsersController from '../controllers/users.controller'
import { users } from '../models/init-models'

class UsersRoute implements Route {
  public path = '/users'
  public router = Router()
  public userController = new UsersController(users);

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationMiddleware(), this.userController.registerUser);
  }
}

export default UsersRoute