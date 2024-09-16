import bcrypt from 'bcrypt';
import { Model, ModelStatic, CreationAttributes } from 'sequelize';
import BaseRoute from '../routes/base.route';
import { ObjectUtil } from '../utils/object.util';
import HttpException from '../exceptions/HttpException';
import BaseService from './base.service';
import jwt from 'jsonwebtoken';

class UsersService<T extends Model<typeof BaseRoute.userModel>> {
  private userModel: ModelStatic<T>;
  private baseService: BaseService<T>;

  constructor(userModel: ModelStatic<T>) {
    this.userModel = userModel;
    this.baseService = new BaseService();
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.USER_PASSWORD_HASH_SALT || '10', 10);
    return bcrypt.hash(password, saltRounds);
  }

  private async validatePassword(user: Partial<T>, password: string): Promise<boolean> {
    const isPasswordValid = await bcrypt.compare(password, user[BaseRoute.fieldNameUserPassword]);
    if (!isPasswordValid) throw new HttpException(401, 'Invalid email or password');
    return true;
  }

  public async registerUser(userDatas: Partial<CreationAttributes<T>>): Promise<Partial<T>> {
    const passwordField = BaseRoute.fieldNameUserPassword as keyof T;
    const password = userDatas[passwordField as string] as string | undefined;
    if (!password) throw new Error('Password is required.');
    userDatas[passwordField as string] = await this.hashPassword(password);
    const createdUser = await this.userModel.create(userDatas as CreationAttributes<T>);
    return ObjectUtil.filterKeys(createdUser, [passwordField]);
  }

  public async loginUser(username: string, password: string): Promise<string> {
    if (!username || !password) throw new HttpException(400, 'Username and password are required');
    const user = await this.baseService.findMultipleByFieldName(BaseRoute.userModelName, BaseRoute.fieldNameUsername, username);
    if (!user || user.length === 0) throw new HttpException(401, 'User not found');
    await this.validatePassword(user[0], password);
    const token = jwt.sign({ username: user[0][BaseRoute.fieldNameUsername] }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' });
    return token;
  }
}

export default UsersService;