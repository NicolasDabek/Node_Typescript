import HttpException from '../exceptions/HttpException';
import DB from '../databases'
import { Model, ModelStatic } from 'sequelize';

export class SequelizeUtil<T extends Model> {
  private models = DB.Models

  public getModel = (modelName: string): ModelStatic<T> => {
    const model = this.models[modelName] as ModelStatic<T>;
    if (!model) throw new HttpException(404, "Model not found.");
    return model;
  };
}