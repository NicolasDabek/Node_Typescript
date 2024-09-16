import { Router } from 'express'
import Route from '../interfaces/routes.interface'
import validationMiddleware from '../middlewares/validation.middleware'
import UsersController from '../controllers/users.controller'
import BaseRoute from './base.route'

class UsersRoute implements Route {
  public path = '/users'
  public router = Router()
  public userController = new UsersController(BaseRoute.userModel);

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/register`, validationMiddleware(), this.userController.registerUser);
    this.router.post(`${this.path}/login`, this.userController.loginUser);
  }
}

export default UsersRoute