import bcrypt from 'bcrypt';
import { users } from '../models/users';
import { ObjectUtil } from '../utils/object.util';
import BaseRoute from '../routes/base.route';

class UsersService {
  private userModel = BaseRoute.userTable;

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.USER_PASSWORD_HASH_SALT, 10);
    return bcrypt.hash(password, saltRounds);
  }

  public async registerUser(userDatas: Partial<typeof this.userModel>): Promise<Partial<users>> {
    userDatas[BaseRoute.fieldNameUserPassword] = await this.hashPassword(
      userDatas[BaseRoute.fieldNameUserPassword] as string
    );

    const createdUser = await this.userModel.create(userDatas);

    const userWithoutPasswordField = ObjectUtil.filterKeys(
      createdUser,
      [BaseRoute.fieldNameUserPassword] as (keyof users)[]
    );

    return userWithoutPasswordField;
  }
}

export default UsersService;