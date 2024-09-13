import { Request, Response, NextFunction } from "express";
import UsersService from "../services/users.service";
import HttpException from "../exceptions/HttpException";
import BaseRoute from "../routes/base.route";

class UsersController {
  private static userService = new UsersService(BaseRoute.userTable);

  public static async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const datas = req.body;
      const createdUser = await this.userService.registerUser(datas);
      return res.status(201).json({ data: createdUser });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }
}

export default UsersController;