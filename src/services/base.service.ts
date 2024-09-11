import bcrypt from 'bcrypt';
import DB from '../databases';
import HttpException from '../exceptions/HttpException';
import { isEmpty } from '../utils/others.util';
import { Model } from 'sequelize';
import { BaseDto } from '../dtos/base.dto';
import BaseRoute from '../routes/base.route';

class BaseService {
  private models = DB.Models;

  public async findAllDatas(tableName: string): Promise<Model[]> {
    if (isEmpty(tableName)) throw new HttpException(400, "Table name is required.");
    return await this.models[tableName]?.findAll();
  }

  public async findDataById(tableName: string, dataId: number): Promise<Model> {
    if (isNaN(dataId)) throw new HttpException(400, "Valid data ID is required.");
    const findData: Model = await this.models[tableName]?.findByPk(dataId);
    if (!findData) throw new HttpException(404, "Data not found.");
    return findData;
  }

  /**
   * Récupère un seul champ sur toutes les entrées.
   */
  public async findAllDatasOneField(tableName: string, fieldName: string): Promise<Model[]> {
    const options: Object = { where: { deleted: 0 }, attributes: ["id", fieldName] };
    return await this.models[tableName]?.findAll(options);
  }

  /**
   * Récupère plusieurs entrées par la valeur d'un champ.
   */
  public async findMultipleByFieldName(tableName: string, fieldName: string, fieldVal: number): Promise<Model[]> {
    if (isEmpty(fieldName) || isEmpty(fieldVal)) throw new HttpException(400, "Field name and value are required.");
    const options: Object = { where: { [fieldName]: fieldVal } };
    const rows = await this.models[tableName]?.findAll(options);
    if (!rows) throw new HttpException(404, "No rows found.");
    return rows;
  }

  public async findLastData(tableName: string): Promise<Model> {
    try {
      const options: Object = { order: [['id', 'DESC']], limit: 1 };
      const lastData = await this.models[tableName]?.findOne(options);
      if (!lastData) throw new HttpException(404, "No data found.");
      return lastData;
    } catch (error) {
      console.error('Erreur lors de la récupération de la dernière donnée:', error);
    }
  };

  public async createData(tableName: string, datas: BaseDto): Promise<Model> {
    if (isEmpty(datas)) throw new HttpException(400, "Data is required.");
    if (BaseRoute.usersTableName.includes(tableName) && datas["password"]) {
      datas["password"] = await bcrypt.hash(datas["password"], parseInt(process.env.USER_PASSWORD_HASH_SALT, 10));
    }
    return await this.models[tableName]?.create(datas);
  }

  public async updateData(tableName: string, dataId: number, datas: BaseDto): Promise<Model> {
    if (isEmpty(datas)) throw new HttpException(400, "Data is required.");
    const findData: Model = await this.models[tableName].findByPk(dataId);
    if (!findData) throw new HttpException(404, "Data not found.");
    if (BaseRoute.usersTableName.includes(tableName) && datas["password"]) {
      datas["password"] = await bcrypt.hash(datas["password"], parseInt(process.env.USER_PASSWORD_HASH_SALT, 10));
    }
    await this.models[tableName].update(datas, { where: { id: dataId } });
    return await this.models[tableName]?.findByPk(dataId);
  }

  public async deleteData(tableName: string, dataId: number): Promise<Model> {
    if (isNaN(dataId)) throw new HttpException(400, "Valid data ID is required.");
    const findData: Model = await this.models[tableName].findByPk(dataId);
    if (!findData) throw new HttpException(404, "Data not found.");
    await this.models[tableName]?.destroy({ where: { id: dataId } });
    return findData;
  }
}

export default BaseService;
