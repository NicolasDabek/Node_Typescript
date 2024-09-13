import { Request, Response, NextFunction } from "express";
import UsersService from "../services/users.service";
import HttpException from "../exceptions/HttpException";
import { createDtos } from "../dtos";

class UsersController {
  static userService = new UsersService();

  static async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const datas: typeof createDtos.users = req.body;
      const createdUser = await this.userService.registerUser(datas);
      return res.status(200).json({ datas: createdUser });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }
}

export default UsersController