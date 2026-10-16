import bcrypt from 'bcrypt';
import { Model, ModelStatic, CreationAttributes, WhereOptions } from 'sequelize';
import BaseRoute from '../routes/base.route';
import HttpException from '../exceptions/HttpException';
import { signAuthToken } from '../utils/jwt.util';
import { hashPassword } from '../utils/password.util';
import { DataStoredInToken, TokenData } from '../interfaces/auth.interface';

type Attributes = Record<string, unknown>;

class UsersService<T extends Model> {
  constructor(private userModel: ModelStatic<T>) {}

  private get usernameField() { return BaseRoute.fieldNameUsername; }
  private get passwordField() { return BaseRoute.fieldNameUserPassword; }

  private findByUsername(username: string): Promise<T | null> {
    return this.userModel.findOne({ where: { [this.usernameField]: username } as WhereOptions });
  }

  /** Représentation publique d'un utilisateur : jamais de mot de passe (même hashé). */
  private toPublic(user: T): Attributes {
    const { [this.passwordField]: _omit, ...rest } = user.get({ plain: true }) as Attributes;
    return rest;
  }

  public async registerUser(userDatas: CreationAttributes<T>): Promise<Attributes> {
    const datas = { ...(userDatas as Attributes) };
    const username = datas[this.usernameField];
    const password = datas[this.passwordField];
    if (!username) throw new HttpException(400, 'Username is required.');
    if (!password) throw new HttpException(400, 'Password is required.');

    if (await this.findByUsername(String(username))) throw new HttpException(400, 'Username already exists.');

    datas[this.passwordField] = await hashPassword(String(password));
    const createdUser = await this.userModel.create(datas as CreationAttributes<T>);
    return this.toPublic(createdUser);
  }

  public async loginUser(username: string, password: string): Promise<TokenData> {
    if (!username || !password) throw new HttpException(400, 'Username and password are required');
    const user = await this.findByUsername(username);
    // Même message dans les deux cas pour ne pas révéler si le compte existe.
    const hash = user?.get(this.passwordField) as string | undefined;
    if (!user || !hash || !(await bcrypt.compare(password, hash))) {
      throw new HttpException(401, 'Invalid username or password');
    }

    const datasInToken: DataStoredInToken = {
      id: user.get(this.userModel.primaryKeyAttribute) as number,
      username: user.get(this.usernameField) as string,
    };
    return signAuthToken(datasInToken);
  }
}

export default UsersService;
