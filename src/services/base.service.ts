import HttpException from '../exceptions/HttpException';
import { isEmpty } from '../utils/others.util';
import { CreationAttributes, Model, ModelStatic, WhereOptions } from 'sequelize';
import { SequelizeUtil } from '../utils/sequelize.util';
import { assertCrudAccess, resolveCrudModel } from '../crud/registry';
import { CrudData, CrudOperation, ResolvedCrudModel } from '../crud/crud.interface';

interface Target<T extends Model> {
  model: ModelStatic<T>;
  config: ResolvedCrudModel;
}

/**
 * Service du CRUD générique. Chaque méthode vérifie que le modèle est exposé et que
 * l'opération est autorisée, applique les hooks et masque les champs cachés (src/crud/overrides).
 */
class BaseService<T extends Model = Model> {
  private sequelizeUtil = new SequelizeUtil<T>();

  private target(modelName: string, operation: CrudOperation, skipAccessCheck = false): Target<T> {
    const config = skipAccessCheck ? resolveCrudModel(modelName) : assertCrudAccess(modelName, operation);
    return { model: this.sequelizeUtil.getModel(config.name), config };
  }

  private async findOrFail({ model }: Target<T>, dataId: number): Promise<T> {
    if (isNaN(dataId)) throw new HttpException(400, 'Valid data ID is required.');
    const found = await model.findByPk(dataId);
    if (!found) throw new HttpException(404, 'Data not found.');
    return found;
  }

  private assertField({ model, config }: Target<T>, fieldName: string) {
    if (isEmpty(fieldName)) throw new HttpException(400, 'Field name is required.');
    if (!model.getAttributes()[fieldName] || config.hiddenFields.includes(fieldName)) {
      throw new HttpException(400, `Unknown field '${fieldName}'.`);
    }
  }

  /** Données sortantes : champs cachés retirés puis hook serialize éventuel. */
  private serialize({ config }: Target<T>, record: T): CrudData {
    const plain = record.get({ plain: true }) as CrudData;
    for (const field of config.hiddenFields) delete plain[field];
    return config.hooks.serialize ? config.hooks.serialize(plain) : plain;
  }

  private byPk(model: ModelStatic<T>, dataId: number): WhereOptions {
    return { [model.primaryKeyAttribute]: dataId } as WhereOptions;
  }

  public async findAllDatas(modelName: string): Promise<CrudData[]> {
    const t = this.target(modelName, 'list');
    return (await t.model.findAll()).map(r => this.serialize(t, r));
  }

  public async findDataById(modelName: string, dataId: number): Promise<CrudData> {
    const t = this.target(modelName, 'read');
    return this.serialize(t, await this.findOrFail(t, dataId));
  }

  public async findAllDatasOneField(modelName: string, fieldName: string): Promise<CrudData[]> {
    const t = this.target(modelName, 'field');
    this.assertField(t, fieldName);
    return (await t.model.findAll({ attributes: [t.model.primaryKeyAttribute, fieldName] })).map(r => this.serialize(t, r));
  }

  public async findMultipleByFieldName(modelName: string, fieldName: string, fieldVal: string | number, skipAccessCheck = false): Promise<CrudData[]> {
    const t = this.target(modelName, 'search', skipAccessCheck);
    this.assertField(t, fieldName);
    if (isEmpty(fieldVal)) throw new HttpException(400, 'Field name and value are required.');
    return (await t.model.findAll({ where: { [fieldName]: fieldVal } as WhereOptions })).map(r => this.serialize(t, r));
  }

  public async findLastData(modelName: string): Promise<CrudData> {
    const t = this.target(modelName, 'read');
    const lastData = await t.model.findOne({ order: [[t.model.primaryKeyAttribute, 'DESC']] });
    if (!lastData) throw new HttpException(404, 'No data found.');
    return this.serialize(t, lastData);
  }

  public async createData(modelName: string, datas: CreationAttributes<T> | CrudData): Promise<CrudData> {
    const t = this.target(modelName, 'create');
    if (isEmpty(datas)) throw new HttpException(400, 'Data is required.');
    let data = { ...(datas as CrudData) };
    if (t.config.hooks.beforeCreate) data = await t.config.hooks.beforeCreate(data);
    return this.serialize(t, await t.model.create(data as CreationAttributes<T>));
  }

  public async updateData(modelName: string, dataId: number, datas: Partial<T> | CrudData): Promise<CrudData> {
    const t = this.target(modelName, 'update');
    if (isEmpty(datas)) throw new HttpException(400, 'Data is required.');
    await this.findOrFail(t, dataId);
    let data = { ...(datas as CrudData) };
    if (t.config.hooks.beforeUpdate) data = await t.config.hooks.beforeUpdate(data, dataId);
    await t.model.update(data as Partial<T["_attributes"]>, { where: this.byPk(t.model, dataId) });
    return this.serialize(t, await this.findOrFail(t, dataId));
  }

  public async deleteData(modelName: string, dataId: number): Promise<CrudData> {
    const t = this.target(modelName, 'delete');
    const found = await this.findOrFail(t, dataId);
    await t.model.destroy({ where: this.byPk(t.model, dataId) });
    return this.serialize(t, found);
  }
}

export default BaseService;
