import authMiddleware from '../../src/middlewares/auth.middleware';
import errorMiddleware from '../../src/middlewares/error.middleware';
import validationMiddleware from '../../src/middlewares/validation.middleware';
import HttpException from '../../src/exceptions/HttpException';
import BaseRoute from '../../src/routes/base.route';
import { signAuthToken } from '../../src/utils/jwt.util';
import { logger } from '../../src/utils/logger.util';
import { mockRes } from './helpers';

const env = { ...process.env };

describe('authMiddleware', () => {
  afterEach(() => jest.restoreAllMocks());

  it('401 JSON sans token', async () => {
    const res = mockRes(); const next = jest.fn();
    await authMiddleware({ headers: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 si token invalide ou utilisateur introuvable', async () => {
    const next = jest.fn();
    await authMiddleware({ headers: { authorization: 'Bearer bad' } } as any, mockRes(), next);
    jest.spyOn(BaseRoute.userModel, 'findByPk').mockResolvedValue(null);
    const { token } = signAuthToken({ id: 1, username: 'a' });
    await authMiddleware({ headers: { authorization: `Bearer ${token}` } } as any, mockRes(), next);
    expect(next.mock.calls.map(c => c[0])).toEqual([expect.any(HttpException), expect.any(HttpException)]);
    expect(next.mock.calls.map(c => c[0].status)).toEqual([401, 401]);
  });

  it('attache l’utilisateur trouvé par l’id du token', async () => {
    const user = { id: 7 };
    const findByPk = jest.spyOn(BaseRoute.userModel, 'findByPk').mockResolvedValue(user as any);
    const { token } = signAuthToken({ id: 7, username: 'a' });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    await authMiddleware(req, mockRes(), next);
    expect(findByPk).toHaveBeenCalledWith(7);
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('errorMiddleware', () => {
  let warn: jest.SpyInstance; let error: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    error = jest.spyOn(logger, 'error').mockImplementation(() => logger);
  });
  afterEach(() => { jest.restoreAllMocks(); process.env = { ...env }; });
  const req: any = { method: 'GET', originalUrl: '/x' };

  it('conserve statut et message d’une HttpException (warn)', () => {
    const res = mockRes();
    errorMiddleware(new HttpException(404, 'Nope'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Nope' });
    expect(warn).toHaveBeenCalled();
  });

  it('message par défaut si HttpException sans message', () => {
    const res = mockRes();
    errorMiddleware(new HttpException(400, ''), req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ message: 'Something went wrong' });
  });

  it('500 générique pour une erreur inconnue, sans fuite de détail', () => {
    const res = mockRes();
    errorMiddleware(new Error('secret sql'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('secret sql'));
    const noStack = new Error('m'); noStack.stack = undefined;
    errorMiddleware(noStack, req, mockRes(), jest.fn());
    expect(error).toHaveBeenLastCalledWith(expect.stringContaining(':: m'));
  });

  it('ajoute la stack en développement', () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    errorMiddleware(new HttpException(400, 'x'), req, res, jest.fn());
    expect(res.json.mock.calls[0][0]).toHaveProperty('stack');
  });
});

describe('validationMiddleware', () => {
  const run = async (mw: any, req: any) => {
    const next = jest.fn();
    await mw({ params: {}, path: '/', ...req }, mockRes(), next);
    return next.mock.calls[0][0];
  };
  const valid = { productName: 'p', price: 2 };

  it('accepte un corps valide (DTO de création, modèle via params ou chemin)', async () => {
    expect(await run(validationMiddleware(), { params: { model: 'Products' }, body: { ...valid } })).toBeUndefined();
    expect(await run(validationMiddleware(), { path: '/products', body: { ...valid } })).toBeUndefined();
  });

  it('400 si aucun DTO pour le modèle', async () => {
    expect(await run(validationMiddleware(), { path: '/unknown', body: {} })).toMatchObject({ status: 400, message: 'No DTO found for model unknown' });
  });

  it('400 avec les contraintes non respectées et les champs interdits', async () => {
    const err = await run(validationMiddleware(), { params: { model: 'products' }, body: { productName: 3, price: 2, extra: 1 } });
    expect(err.status).toBe(400);
    expect(err.message).toMatch(/productName must be a string/);
    expect(err.message).toMatch(/property extra should not exist/);
  });

  it('skipMissingProperties pour les mises à jour partielles', async () => {
    expect(await run(validationMiddleware('body', true), { params: { model: 'products' }, body: { price: 4 } })).toBeUndefined();
  });

  it('valide query/params avec le DTO complet', async () => {
    const err = await run(validationMiddleware('query'), { params: { model: 'products' }, query: { ...valid } });
    expect(err.message).toMatch(/id must be a number/);
  });

  it('convertit les dates ISO, refuse les dates invalides', async () => {
    const user = { username: 'u', password: 'p', email: 'e@x.fr', isActive: 1, addressIP: '1', dateCreation: '2024-01-01T00:00:00.000Z' };
    const req: any = { params: { model: 'users' }, body: { ...user } };
    expect(await run(validationMiddleware(), req)).toBeUndefined();
    expect(req.body.dateCreation).toBeInstanceOf(Date);

    expect(await run(validationMiddleware(), { params: { model: 'users' }, body: { ...user, dateCreation: 'pas une date' } }))
      .toMatchObject({ status: 400, message: 'dateCreation is an invalid date' });
    expect(await run(validationMiddleware(), { params: { model: 'users' }, body: { ...user, dateCreation: 'Invalid Date' } }))
      .toMatchObject({ status: 400 });
    const mixed = await run(validationMiddleware(), { params: { model: 'users' }, body: { ...user, username: 5 } });
    expect(mixed).toMatchObject({ status: 400 });
    const afterDate = await run(validationMiddleware(), { params: { model: 'users' }, body: { ...user, isActive: 'x', dateCreation: '2024-01-01' } });
    expect(afterDate.message).toMatch(/isActive/);
  });
});
