import bcrypt from 'bcrypt';
import UsersService from '../../src/services/users.service';
import UsersController from '../../src/controllers/users.controller';
import { verifyAuthToken } from '../../src/utils/jwt.util';
import { flush, mockRes, record } from './helpers';

jest.mock('../../src/utils/password.util', () => ({ hashPassword: jest.fn(async (p: string) => `hashed:${p}`) }));

const fakeModel = () => ({ primaryKeyAttribute: 'id', findOne: jest.fn(), create: jest.fn() });

describe('UsersService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('registerUser : champs requis, unicité, mot de passe hashé et jamais renvoyé', async () => {
    const model = fakeModel();
    const service = new UsersService(model as any);
    await expect(service.registerUser({ password: 'x' } as any)).rejects.toMatchObject({ status: 400, message: 'Username is required.' });
    await expect(service.registerUser({ username: 'a' } as any)).rejects.toMatchObject({ status: 400, message: 'Password is required.' });

    model.findOne.mockResolvedValueOnce(record({ id: 1 }));
    await expect(service.registerUser({ username: 'a', password: 'x' } as any)).rejects.toMatchObject({ message: 'Username already exists.' });

    model.findOne.mockResolvedValueOnce(null);
    model.create.mockImplementation(async (d: any) => record({ id: 2, ...d }));
    expect(await service.registerUser({ username: 'a', password: 'x' } as any)).toEqual({ id: 2, username: 'a' });
    expect(model.create).toHaveBeenCalledWith({ username: 'a', password: 'hashed:x' });
    expect(model.findOne).toHaveBeenCalledWith({ where: { username: 'a' } });
  });

  it('loginUser : 400 sans identifiants, 401 identique si inconnu ou mauvais mot de passe', async () => {
    const model = fakeModel();
    const service = new UsersService(model as any);
    await expect(service.loginUser('', 'x')).rejects.toMatchObject({ status: 400 });

    model.findOne.mockResolvedValueOnce(null);
    await expect(service.loginUser('a', 'x')).rejects.toMatchObject({ status: 401, message: 'Invalid username or password' });

    model.findOne.mockResolvedValueOnce(record({ id: 1, username: 'a' }));
    await expect(service.loginUser('a', 'x')).rejects.toMatchObject({ status: 401 });

    const compare = jest.spyOn(bcrypt, 'compare') as unknown as jest.Mock;
    compare.mockResolvedValueOnce(false);
    model.findOne.mockResolvedValueOnce(record({ id: 1, username: 'a', password: 'h' }));
    await expect(service.loginUser('a', 'x')).rejects.toMatchObject({ status: 401 });
  });

  it('loginUser : token signé avec l’id à la racine', async () => {
    const model = fakeModel();
    const service = new UsersService(model as any);
    (jest.spyOn(bcrypt, 'compare') as unknown as jest.Mock).mockResolvedValueOnce(true);
    model.findOne.mockResolvedValueOnce(record({ id: 5, username: 'a', password: 'h' }));
    const { token, expiresIn } = await service.loginUser('a', 'x');
    expect(expiresIn).toBe(3600);
    expect(verifyAuthToken(token)).toMatchObject({ id: 5, username: 'a' });
  });
});

describe('UsersController', () => {
  const setup = () => {
    const controller = new UsersController({} as any);
    const service = (controller as any).userService as UsersService<any>;
    return { controller, service };
  };
  afterEach(() => jest.restoreAllMocks());

  it('registerUser : 400 sans corps, 201 sinon', async () => {
    const { controller, service } = setup();
    const next = jest.fn();
    controller.registerUser({ body: undefined } as any, mockRes(), next);
    await flush();
    expect(next.mock.calls[0][0]).toMatchObject({ status: 400 });

    jest.spyOn(service, 'registerUser').mockResolvedValue({ id: 1 });
    const res = mockRes();
    controller.registerUser({ body: { username: 'a' } } as any, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ datas: { id: 1 } });
  });

  it('loginUser : 400 sans identifiants, 200 avec le token', async () => {
    const { controller, service } = setup();
    const next = jest.fn();
    controller.loginUser({ body: undefined } as any, mockRes(), next);
    controller.loginUser({ body: { username: 'a' } } as any, mockRes(), next);
    await flush();
    expect(next.mock.calls.map(c => c[0].status)).toEqual([400, 400]);

    const login = jest.spyOn(service, 'loginUser').mockResolvedValue({ token: 't', expiresIn: 1 });
    const res = mockRes();
    controller.loginUser({ body: { username: 'a', password: 1234 } } as any, res, next);
    await flush();
    expect(login).toHaveBeenCalledWith('a', '1234');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ datas: { token: 't', expiresIn: 1 } });
  });
});
