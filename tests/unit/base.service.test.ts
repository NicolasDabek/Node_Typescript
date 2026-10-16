import BaseService from '../../src/services/base.service';
import DB from '../../src/databases';
import { record } from './helpers';
import * as registry from '../../src/crud/registry';

jest.mock('../../src/utils/password.util', () => ({ hashPassword: jest.fn(async (p: string) => `hashed:${p}`) }));

const products = DB.Models.products as any;
const users = DB.Models.users as any;
const env = { ...process.env };

describe('BaseService (modèles Sequelize mockés)', () => {
  const service = new BaseService();
  afterEach(() => { jest.restoreAllMocks(); process.env = { ...env }; });

  it('findAllDatas sérialise chaque enregistrement', async () => {
    jest.spyOn(products, 'findAll').mockResolvedValue([record({ id: 1 }), record({ id: 2 })]);
    expect(await service.findAllDatas('products')).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('refuse un modèle bloqué avant toute requête', async () => {
    const findAll = jest.spyOn(users, 'findAll');
    await expect(service.findAllDatas('users')).rejects.toMatchObject({ status: 403 });
    expect(findAll).not.toHaveBeenCalled();
  });

  it('findDataById : 400 id invalide, 404 absent, sinon la donnée', async () => {
    const findByPk = jest.spyOn(products, 'findByPk').mockResolvedValueOnce(null).mockResolvedValueOnce(record({ id: 3 }));
    await expect(service.findDataById('products', NaN)).rejects.toMatchObject({ status: 400 });
    await expect(service.findDataById('products', 3)).rejects.toMatchObject({ status: 404 });
    expect(await service.findDataById('products', 3)).toEqual({ id: 3 });
    expect(findByPk).toHaveBeenCalledWith(3);
  });

  it('findAllDatasOneField valide le champ', async () => {
    const findAll = jest.spyOn(products, 'findAll').mockResolvedValue([record({ id: 1, price: 2 })]);
    await expect(service.findAllDatasOneField('products', '')).rejects.toMatchObject({ status: 400, message: 'Field name is required.' });
    await expect(service.findAllDatasOneField('products', 'nope')).rejects.toMatchObject({ status: 400, message: "Unknown field 'nope'." });
    expect(await service.findAllDatasOneField('products', 'price')).toEqual([{ id: 1, price: 2 }]);
    expect(findAll).toHaveBeenCalledWith({ attributes: ['id', 'price'] });
  });

  it('findMultipleByFieldName filtre, et refuse une valeur vide ou un champ caché', async () => {
    const findAll = jest.spyOn(products, 'findAll').mockResolvedValue([record({ id: 1 })]);
    expect(await service.findMultipleByFieldName('products', 'price', 0)).toEqual([{ id: 1 }]);
    expect(findAll).toHaveBeenCalledWith({ where: { price: 0 } });
    await expect(service.findMultipleByFieldName('products', 'price', '')).rejects.toMatchObject({ status: 400 });
    // skipAccessCheck : usage interne sur un modèle bloqué, mais champs cachés toujours refusés
    jest.spyOn(users, 'findAll').mockResolvedValue([record({ id: 1, username: 'a', password: 'h' })]);
    expect(await service.findMultipleByFieldName('users', 'username', 'a', true)).toEqual([{ id: 1, username: 'a' }]);
    await expect(service.findMultipleByFieldName('users', 'password', 'h', true)).rejects.toMatchObject({ status: 400 });
  });

  it('findLastData trie par clé primaire décroissante', async () => {
    const findOne = jest.spyOn(products, 'findOne').mockResolvedValueOnce(null).mockResolvedValueOnce(record({ id: 9 }));
    await expect(service.findLastData('products')).rejects.toMatchObject({ status: 404 });
    expect(await service.findLastData('products')).toEqual({ id: 9 });
    expect(findOne).toHaveBeenCalledWith({ order: [['id', 'DESC']] });
  });

  it('createData : 400 si vide, applique beforeCreate et masque les champs cachés', async () => {
    process.env.CRUD_BLOCKED_MODELS = '';
    await expect(service.createData('products', {})).rejects.toMatchObject({ status: 400 });
    const create = jest.spyOn(users, 'create').mockImplementation(async (d: any) => record({ id: 1, ...d }));
    expect(await service.createData('users', { username: 'a', password: 'pw' })).toEqual({ id: 1, username: 'a' });
    expect(create).toHaveBeenCalledWith({ username: 'a', password: 'hashed:pw' });
    jest.spyOn(products, 'create').mockImplementation(async (d: any) => record({ id: 2, ...d }));
    expect(await service.createData('products', { productName: 'p' })).toEqual({ id: 2, productName: 'p' });
  });

  it('updateData : 400 si vide, 404 si absent, beforeUpdate puis relit', async () => {
    process.env.CRUD_BLOCKED_MODELS = '';
    await expect(service.updateData('users', 1, {})).rejects.toMatchObject({ status: 400 });
    jest.spyOn(users, 'findByPk').mockResolvedValueOnce(null);
    await expect(service.updateData('users', 1, { username: 'b' })).rejects.toMatchObject({ status: 404 });
    jest.spyOn(users, 'findByPk').mockResolvedValue(record({ id: 1, username: 'b', password: 'x' }));
    const update = jest.spyOn(users, 'update').mockResolvedValue([1]);
    expect(await service.updateData('users', 1, { password: 'new' })).toEqual({ id: 1, username: 'b' });
    expect(update).toHaveBeenCalledWith({ password: 'hashed:new' }, { where: { id: 1 } });
    jest.spyOn(products, 'findByPk').mockResolvedValue(record({ id: 1 }));
    jest.spyOn(products, 'update').mockResolvedValue([1]);
    expect(await service.updateData('products', 1, { price: 3 })).toEqual({ id: 1 });
  });

  it('deleteData renvoie l’enregistrement supprimé', async () => {
    jest.spyOn(products, 'findByPk').mockResolvedValue(record({ id: 4 }));
    const destroy = jest.spyOn(products, 'destroy').mockResolvedValue(1);
    expect(await service.deleteData('products', 4)).toEqual({ id: 4 });
    expect(destroy).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  it('applique le hook serialize d’une surcharge', async () => {
    jest.spyOn(registry, 'assertCrudAccess').mockReturnValue({
      name: 'products', exposed: true, auth: false, operations: ['list'], hiddenFields: [],
      hooks: { serialize: r => ({ ...r, extra: true }) },
    });
    jest.spyOn(products, 'findAll').mockResolvedValue([record({ id: 1 })]);
    expect(await service.findAllDatas('products')).toEqual([{ id: 1, extra: true }]);
  });
});
