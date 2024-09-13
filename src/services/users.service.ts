import bcrypt from 'bcrypt';
import { Model, ModelStatic, CreationAttributes } from 'sequelize';
import BaseRoute from '../routes/base.route';
import { ObjectUtil } from '../utils/object.util';

type UserAttributes<T extends Model> = CreationAttributes<T>;

class UsersService<T extends Model> {
  private userModel: ModelStatic<T>;

  constructor(userModel: ModelStatic<T>) {
    this.userModel = userModel;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.USER_PASSWORD_HASH_SALT || '10', 10);
    return bcrypt.hash(password, saltRounds);
  }

  public async registerUser(userDatas: UserAttributes<T>): Promise<Omit<T, typeof BaseRoute.fieldNameUserPassword>> {
    const passwordField = BaseRoute.fieldNameUserPassword as keyof UserAttributes<T>;
    const password = userDatas[passwordField] as string | undefined;

    if (!password) {
      throw new Error('Password is required.');
    }

    userDatas[passwordField] = await this.hashPassword(password) as any;

    const createdUser = (await this.userModel.create(userDatas)).get({ plain: true });

    const userWithoutPasswordField = ObjectUtil.filterKeys(
      createdUser,
      [passwordField] as (keyof UserAttributes<T>)[]
    );

    return userWithoutPasswordField as Omit<T, typeof BaseRoute.fieldNameUserPassword>;
  }
}

export default UsersService;