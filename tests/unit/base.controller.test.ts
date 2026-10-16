import BaseController from '../../src/controllers/base.controller';
import { flush, mockRes } from './helpers';

const service = BaseController.baseService as any;

describe('BaseController', () => {
  afterEach(() => jest.restoreAllMocks());

  const call = async (handler: any, params: Record<string, string>, body?: unknown) => {
    const res = mockRes();
    const next = jest.fn();
    handler({ params, body } as any, res, next);
    await flush();
    return { res, next };
  };

  it.each([
    ['getAllDatas', 'findAllDatas', { model: 'products' }, ['products'], 200],
    ['getDataById', 'findDataById', { model: 'products', id: '3' }, ['products', 3], 200],
    ['getAllDataOneField', 'findAllDatasOneField', { model: 'products', fieldName: 'price' }, ['products', 'price'], 200],
    ['getLastData', 'findLastData', { model: 'products' }, ['products'], 200],
    ['deleteData', 'deleteData', { model: 'products', id: '2' }, ['products', 2], 200],
  ])('%s délègue à %s', async (handler, method, params, args, status) => {
    const spy = jest.spyOn(service, method).mockResolvedValue('R');
    const { res } = await call((BaseController as any)[handler], params as any);
    expect(spy).toHaveBeenCalledWith(...(args as unknown[]));
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ datas: 'R' });
  });

  it('createData répond 201 et updateData 200 avec le corps', async () => {
    const create = jest.spyOn(service, 'createData').mockResolvedValue('C');
    const update = jest.spyOn(service, 'updateData').mockResolvedValue('U');
    const created = await call(BaseController.createData, { model: 'products' }, { a: 1 });
    const updated = await call(BaseController.updateData, { model: 'products', id: '1' }, { a: 2 });
    expect(create).toHaveBeenCalledWith('products', { a: 1 });
    expect(update).toHaveBeenCalledWith('products', 1, { a: 2 });
    expect(created.res.status).toHaveBeenCalledWith(201);
    expect(updated.res.status).toHaveBeenCalledWith(200);
  });

  it.each([['12', 12], ['012', '012'], ['abc', 'abc'], ['', ''], ['1.5', 1.5]])(
    'getMultipleByFieldVal convertit %p en %p', async (raw, parsed) => {
      const spy = jest.spyOn(service, 'findMultipleByFieldName').mockResolvedValue([]);
      await call(BaseController.getMultipleByFieldVal, { model: 'products', fieldName: 'price', fieldVal: raw as string });
      expect(spy).toHaveBeenCalledWith('products', 'price', parsed);
    });

  it('transmet les erreurs du service à next', async () => {
    const error = new Error('db');
    jest.spyOn(service, 'findAllDatas').mockRejectedValue(error);
    const { next, res } = await call(BaseController.getAllDatas, { model: 'products' });
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
