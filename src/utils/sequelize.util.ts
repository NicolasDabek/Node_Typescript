import HttpException from '../exceptions/HttpException';
import DB from '../databases';
import { Model, ModelStatic } from 'sequelize';

export class SequelizeUtil<T extends Model> {
  private models = DB.Models;

  public getModel = (modelName: string): ModelStatic<T> => {
    const requested = modelName.toLowerCase();
    const match = Object.keys(this.models).find(key => key.toLowerCase() === requested);
    const model = match ? (this.models as Record<string, ModelStatic<T>>)[match] : undefined;
    if (!model) throw new HttpException(404, `Model '${modelName}' not found.`);
    return model;
  };
}
