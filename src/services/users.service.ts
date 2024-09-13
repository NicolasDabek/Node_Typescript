import bcrypt from 'bcrypt';
import { Model, ModelStatic, CreationAttributes } from 'sequelize';
import BaseRoute from '../routes/base.route';
import { ObjectUtil } from '../utils/object.util';

type UserCreationAttributes<T extends Model> = CreationAttributes<T> & { [key: string]: any };

class UsersService<T extends Model> {
  private userModel: ModelStatic<T>;

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
}

export default UsersService;