import bcrypt from 'bcrypt';
import HttpException from '../exceptions/HttpException';
import { isEmpty } from '../utils/others.util';
import { CreationAttributes, Model, WhereOptions } from 'sequelize';
import BaseRoute from '../routes/base.route';
import { SequelizeUtil } from '../utils/sequelize.util';
import { assertModelAccessible } from '../utils/modelAccess.util';

class BaseService<T extends Model> {
  private sequelizeUtil = new SequelizeUtil<T>();

  public async findAllDatas(modelName: string): Promise<Model[]> {
    const name = assertModelAccessible(modelName);
    return await this.sequelizeUtil.getModel(name).findAll();
  }

  public async findDataById(modelName: string, dataId: number): Promise<Model> {
    const name = assertModelAccessible(modelName);
    if (isNaN(dataId)) throw new HttpException(400, 'Valid data ID is required.');
    const findData: Model | null = await this.sequelizeUtil.getModel(name).findByPk(dataId);
    if (!findData) throw new HttpException(404, 'Data not found.');
    return findData;
  }

  public async findAllDatasOneField(modelName: string, fieldName: string): Promise<T[]> {
    const name = assertModelAccessible(modelName);
    if (isEmpty(fieldName)) throw new HttpException(400, 'Field name is required.');
    return await this.sequelizeUtil.getModel(name).findAll({ attributes: ['id', fieldName] });
  }

  public async findMultipleByFieldName(modelName: string, fieldName: string, fieldVal: string | number, skipAccessCheck = false): Promise<T[]> {
    const name = skipAccessCheck ? modelName.toLowerCase() : assertModelAccessible(modelName);
    if (isEmpty(fieldName) || isEmpty(fieldVal)) throw new HttpException(400, 'Field name and value are required.');
    return await this.sequelizeUtil.getModel(name).findAll({ where: { [fieldName]: fieldVal } as WhereOptions });
  }

  public async findLastData(modelName: string): Promise<Model> {
    const name = assertModelAccessible(modelName);
    const lastData = await this.sequelizeUtil.getModel(name).findOne({ order: [['id', 'DESC']] });
    if (!lastData) throw new HttpException(404, 'No data found.');
    return lastData;
  }

  public async createData(modelName: string, datas: CreationAttributes<T>): Promise<T> {
    const name = assertModelAccessible(modelName);
    if (isEmpty(datas)) throw new HttpException(400, 'Data is required.');
    return await this.sequelizeUtil.getModel(name).create(datas);
  }

  public async updateData(modelName: string, dataId: number, datas: Partial<T>): Promise<T> {
    const name = assertModelAccessible(modelName);
    if (isEmpty(datas)) throw new HttpException(400, 'Data is required.');

    const model = this.sequelizeUtil.getModel(name);
    const findData = await model.findByPk(dataId);
    if (!findData) throw new HttpException(404, 'Data not found.');

    if (BaseRoute.userModelName === name && (datas as Record<string, unknown>)[BaseRoute.fieldNameUserPassword]) {
      (datas as Record<string, unknown>)[BaseRoute.fieldNameUserPassword] = await bcrypt.hash(
        String((datas as Record<string, unknown>)[BaseRoute.fieldNameUserPassword]),
        parseInt(process.env.USER_PASSWORD_HASH_SALT || '10', 10),
      );
    }

    const whereCondition: WhereOptions<Record<string, unknown>> = { [model.primaryKeyAttribute]: dataId };
    await model.update(datas, { where: whereCondition });
    return (await model.findByPk(dataId)) as T;
  }

  public async deleteData(modelName: string, dataId: number): Promise<Model> {
    const name = assertModelAccessible(modelName);
    if (isNaN(dataId)) throw new HttpException(400, 'Valid data ID is required.');
    const model = this.sequelizeUtil.getModel(name);
    const findData: Model | null = await model.findByPk(dataId);
    if (!findData) throw new HttpException(404, 'Data not found.');
    const whereCondition: WhereOptions<Record<string, unknown>> = { [model.primaryKeyAttribute]: dataId };
    await model.destroy({ where: whereCondition });
    return findData;
  }
}

export default BaseService;
