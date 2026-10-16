import HttpException from '../exceptions/HttpException';
import { isEmpty } from '../utils/others.util';
import { CreationAttributes, Model, ModelStatic, WhereOptions } from 'sequelize';
import BaseRoute from '../routes/base.route';
import { SequelizeUtil } from '../utils/sequelize.util';
import { assertModelAccessible } from '../utils/modelAccess.util';
import { hashPassword } from '../utils/password.util';

type Attributes = Record<string, unknown>;

/** Service du CRUD générique : chaque méthode vérifie que le modèle est exposé avant d'y accéder. */
class BaseService<T extends Model = Model> {
  private sequelizeUtil = new SequelizeUtil<T>();

  /** Modèle exposé correspondant au nom (403 si bloqué, 404 si inconnu). */
  private model(modelName: string, skipAccessCheck = false): ModelStatic<T> {
    const name = skipAccessCheck ? modelName.toLowerCase() : assertModelAccessible(modelName);
    return this.sequelizeUtil.getModel(name);
  }

  private async findOrFail(model: ModelStatic<T>, dataId: number): Promise<T> {
    if (isNaN(dataId)) throw new HttpException(400, 'Valid data ID is required.');
    const found = await model.findByPk(dataId);
    if (!found) throw new HttpException(404, 'Data not found.');
    return found;
  }

  private byPk(model: ModelStatic<T>, dataId: number): WhereOptions {
    return { [model.primaryKeyAttribute]: dataId } as WhereOptions;
  }

  /** Hash le mot de passe si on met à jour le modèle utilisateur. */
  private async prepareUserPassword(model: ModelStatic<T>, datas: Attributes): Promise<Attributes> {
    const field = BaseRoute.fieldNameUserPassword;
    if (model.name.toLowerCase() !== BaseRoute.userModelName || !datas[field]) return datas;
    return { ...datas, [field]: await hashPassword(String(datas[field])) };
  }

  public async findAllDatas(modelName: string): Promise<T[]> {
    return this.model(modelName).findAll();
  }

  public async findDataById(modelName: string, dataId: number): Promise<T> {
    return this.findOrFail(this.model(modelName), dataId);
  }

  public async findAllDatasOneField(modelName: string, fieldName: string): Promise<T[]> {
    const model = this.model(modelName);
    if (isEmpty(fieldName)) throw new HttpException(400, 'Field name is required.');
    if (!model.getAttributes()[fieldName]) throw new HttpException(400, `Unknown field '${fieldName}'.`);
    return model.findAll({ attributes: [model.primaryKeyAttribute, fieldName] });
  }

  public async findMultipleByFieldName(modelName: string, fieldName: string, fieldVal: string | number, skipAccessCheck = false): Promise<T[]> {
    const model = this.model(modelName, skipAccessCheck);
    if (isEmpty(fieldName) || isEmpty(fieldVal)) throw new HttpException(400, 'Field name and value are required.');
    if (!model.getAttributes()[fieldName]) throw new HttpException(400, `Unknown field '${fieldName}'.`);
    return model.findAll({ where: { [fieldName]: fieldVal } as WhereOptions });
  }

  public async findLastData(modelName: string): Promise<T> {
    const model = this.model(modelName);
    const lastData = await model.findOne({ order: [[model.primaryKeyAttribute, 'DESC']] });
    if (!lastData) throw new HttpException(404, 'No data found.');
    return lastData;
  }

  public async createData(modelName: string, datas: CreationAttributes<T>): Promise<T> {
    const model = this.model(modelName);
    if (isEmpty(datas)) throw new HttpException(400, 'Data is required.');
    return model.create((await this.prepareUserPassword(model, datas as Attributes)) as CreationAttributes<T>);
  }

  public async updateData(modelName: string, dataId: number, datas: Partial<T> | Attributes): Promise<T> {
    const model = this.model(modelName);
    if (isEmpty(datas)) throw new HttpException(400, 'Data is required.');
    await this.findOrFail(model, dataId);
    await model.update(await this.prepareUserPassword(model, datas as Attributes), { where: this.byPk(model, dataId) });
    return this.findOrFail(model, dataId);
  }

  public async deleteData(modelName: string, dataId: number): Promise<T> {
    const model = this.model(modelName);
    const found = await this.findOrFail(model, dataId);
    await model.destroy({ where: this.byPk(model, dataId) });
    return found;
  }
}

export default BaseService;
