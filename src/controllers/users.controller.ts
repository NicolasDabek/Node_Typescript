import { Request, Response } from 'express';
import { Model, ModelStatic, CreationAttributes } from 'sequelize';
import UsersService from '../services/users.service';
import HttpException from '../exceptions/HttpException';
import { asyncHandler } from '../utils/asyncHandler.util';

class UsersController<T extends Model> {
  private userService: UsersService<T>;

  constructor(userModel: ModelStatic<T>) {
    this.userService = new UsersService(userModel);
  }

  public registerUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.body) throw new HttpException(400, 'User data is required');
    const createdUser = await this.userService.registerUser(req.body as CreationAttributes<T>);
    res.status(201).json({ datas: createdUser });
  });

  public loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) throw new HttpException(400, 'Username and password are required');
    const token = await this.userService.loginUser(String(username), String(password));
    res.status(200).json({ datas: token });
  });
}

export default UsersController;
