import bcrypt from 'bcrypt';
import { Model, ModelStatic, CreationAttributes, WhereOptions } from 'sequelize';
import BaseRoute from '../routes/base.route';
import { ObjectUtil } from '../utils/object.util';
import HttpException from '../exceptions/HttpException';
import BaseService from './base.service';
import jwt from 'jsonwebtoken';
import { DataStoredInToken, TokenData } from '../interfaces/auth.interface';

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
    const isPasswordValid = await bcrypt.compare(password, user[BaseRoute.fieldNameUserPassword as keyof T] as string);
    if (!isPasswordValid) throw new HttpException(401, 'Invalid email or password');
    return true;
  }

  public async registerUser(userDatas: Partial<T>): Promise<Partial<T>> {
    const usernameField = BaseRoute.fieldNameUsername as keyof T;
    const passwordField = BaseRoute.fieldNameUserPassword as keyof T;
    const username = userDatas[usernameField as string] as string | undefined;
    const password = userDatas[passwordField as string] as string | undefined;

    if (!username) throw new Error('Username is required.');
    if (!password) throw new Error('Password is required.');

    const whereCondition: WhereOptions<any> = { [usernameField]: username };
    const existingUser = await this.userModel.findOne({ where: whereCondition });

    if (existingUser) throw new HttpException(400, 'Username already exists.');

    userDatas[passwordField as string] = await this.hashPassword(password);
    const createdUser = await this.userModel.create(userDatas as CreationAttributes<T>);
    return ObjectUtil.filterKeys(createdUser, [passwordField]);
  }

  public async loginUser(username: string, password: string): Promise<TokenData> {
    if (!username || !password) throw new HttpException(400, 'Username and password are required');
    const users = await this.baseService.findMultipleByFieldName(BaseRoute.userModelName, BaseRoute.fieldNameUsername, username);
    if (users.length === 0) throw new HttpException(401, 'User not found');
    await this.validatePassword(users[0], password);

    const datasInToken: DataStoredInToken = {
      id: users[0][BaseRoute.userModel.primaryKeyAttribute] as number,
      username: users[0][BaseRoute.fieldNameUsername] as string
    };

    const token: TokenData = {
      token: jwt.sign({ datasInToken }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '1h' }),
      expiresIn: 3600
    };

    return token;
  }
}

export default UsersService;