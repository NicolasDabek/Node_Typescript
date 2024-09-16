import { Request, Response, NextFunction } from 'express';
import UsersService from '../services/users.service';
import HttpException from '../exceptions/HttpException';
import { Model, CreationAttributes, ModelStatic } from 'sequelize';

class UsersController<T extends Model> {
  private userService: UsersService<T>;

  constructor(userModel: ModelStatic<T>) {
    this.userService = new UsersService(userModel);
  }

  public registerUser = async (req: Request<{}, {}, Partial<CreationAttributes<T>>>, res: Response, next: NextFunction) => {
    try {
      const datas = req.body;
      const createdUser = await this.userService.registerUser(datas);
      return res.status(201).json({ datas: createdUser });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  };

  public loginUser = async (req: Request<{}, {}, Partial<CreationAttributes<T>>>, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const token = await this.userService.login(username, password);
      return res.status(200).json({ datas : token });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  };
}

export default UsersController;