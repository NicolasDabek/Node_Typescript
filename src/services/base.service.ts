import bcrypt from 'bcrypt';
import DB from '../databases';
import HttpException from '../exceptions/HttpException';
import { isEmpty } from '../utils/others.util';
import { CreationAttributes, Model, ModelStatic, WhereOptions } from 'sequelize';
import BaseRoute from '../routes/base.route';

class BaseService<T extends Model> {
  private models = DB.Models;

  private getModel = (modelName: string): ModelStatic<T> => {
    const model = this.models[modelName] as ModelStatic<T>;
    if (!model) throw new HttpException(404, "Model not found.");
    return model;
  };

  public async findAllDatas(modelName: string): Promise<Model[]> {
    if (isEmpty(modelName)) throw new HttpException(400, "Table name is required.");
    return await this.getModel(modelName).findAll();
  }

  public async findDataById(modelName: string, dataId: number): Promise<Model> {
    if (isNaN(dataId)) throw new HttpException(400, "Valid data ID is required.");
    const findData: Model = await this.getModel(modelName)?.findByPk(dataId);
    if (!findData) throw new HttpException(404, "Data not found.");
    return findData;
  }

  /**
   * Récupère un seul champ sur toutes les entrées.
   */
  public async findAllDatasOneField(modelName: string, fieldName: string): Promise<T[]> {
    const options: Object = { where: { deleted: 0 }, attributes: ["id", fieldName] };
    return await this.getModel(modelName).findAll(options);
  }

  /**
   * Récupère plusieurs entrées par la valeur d'un champ.
   */
  public async findMultipleByFieldName(modelName: string, fieldName: string, fieldVal: string | number): Promise<T[]> {
    if (isEmpty(fieldName) || isEmpty(fieldVal)) throw new HttpException(400, "Field name and value are required.");
    const options: Object = { where: { [fieldName]: fieldVal } };
    const datas = await this.getModel(modelName).findAll(options);
    if (!datas) throw new HttpException(401, "No datas found.");
    return datas;
  }

  public async findLastData(modelName: string): Promise<Model> {
    const options: Object = { order: [['id', 'DESC']], limit: 1 };
    const lastData = (await this.getModel(modelName).findOne(options)).get({ plain: true});
    if (!lastData) throw new HttpException(404, "No data found.");
    return lastData;
  };

  public async createData(modelName: string, datas: CreationAttributes<T>): Promise<T> {
    if (isEmpty(datas)) throw new HttpException(400, "Data is required.");
    return await this.getModel(modelName).create(datas);
  }

  public async updateData(modelName: string, dataId: number, datas: Partial<Model>): Promise<Model> {
    if (isEmpty(datas)) throw new HttpException(400, "Data is required.");

    const model = this.getModel(modelName);
    const findData = await model.findByPk(dataId);
    if (!findData) throw new HttpException(404, "Data not found.");

    if (BaseRoute.userModelName == modelName && datas[BaseRoute.fieldNameUserPassword]) {
      datas[BaseRoute.fieldNameUserPassword] = await bcrypt.hash(
        datas[BaseRoute.fieldNameUserPassword],
        parseInt(process.env.USER_PASSWORD_HASH_SALT, 10)
      );
    }

    const whereCondition: WhereOptions<any> = { [model.primaryKeyAttribute]: dataId };
    await model.update(datas, { where: whereCondition});
    return await model.findByPk(dataId);
  }

  public async deleteData(modelName: string, dataId: number): Promise<Model> {
    if (isNaN(dataId)) throw new HttpException(400, "Valid data ID is required.");
    const findData: Model = await this.models[modelName].findByPk(dataId);
    if (!findData) throw new HttpException(404, "Data not found.");
    await this.models[modelName]?.destroy({ where: { id: dataId } });
    return findData;
  }
}

export default BaseService;
