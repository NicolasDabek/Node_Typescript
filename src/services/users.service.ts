import bcrypt from 'bcrypt';
import { Model, ModelStatic, CreationAttributes } from 'sequelize';
import BaseRoute from '../routes/base.route';
import { ObjectUtil } from '../utils/object.util';
import HttpException from '../exceptions/HttpException';
import BaseService from './base.service';

type UserCreationAttributes<T extends Model> = CreationAttributes<T> & { [key: string]: any };

class UsersService<T extends Model> {
  private userModel: ModelStatic<T>;
  private baseService: BaseService<T> = new BaseService();

  constructor(userModel: ModelStatic<T>) {
    this.userModel = userModel;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.USER_PASSWORD_HASH_SALT || '10', 10);
    return bcrypt.hash(password, saltRounds);
  }

  public async registerUser(userDatas: Partial<UserCreationAttributes<T>>): Promise<Omit<UserCreationAttributes<T>, typeof BaseRoute.fieldNameUserPassword>> {
    const passwordField = BaseRoute.fieldNameUserPassword as keyof UserCreationAttributes<T>;
    const password = userDatas[passwordField] as string | undefined;

    if (!password) {
      throw new Error('Password is required.');
    }

    userDatas[passwordField] = await this.hashPassword(password);

    const createdUser = await this.userModel.create(userDatas as UserCreationAttributes<T>);
    const plainUser = createdUser.get({ plain: true });

    return ObjectUtil.filterKeys(
      plainUser,
      [passwordField] as (keyof UserCreationAttributes<T>)[]
    ) as Omit<UserCreationAttributes<T>, typeof BaseRoute.fieldNameUserPassword>;
  }

  public async validatePassword(user: T, password: string): Promise<boolean> {
    const isPasswordValid = await bcrypt.compare(password, user[BaseRoute.fieldNameUserPassword]);
    if (!isPasswordValid) {
      throw new HttpException(401, 'Invalid email or password');
    }
    return true;
  }

  public async login(username: string, password: string): Promise<T> {
    const user = await this.baseService.findMultipleByFieldName(BaseRoute.userModelName, BaseRoute.fieldNameUsername, username);
    await this.validatePassword(user[0], password);
    return user[0]; // Tu peux aussi ajouter la génération de token JWT ici si nécessaire
  }
}

export default UsersService;