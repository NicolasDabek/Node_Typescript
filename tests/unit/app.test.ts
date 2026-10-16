import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import request from 'supertest';
import App from '../../src/app';
import DB from '../../src/databases';
import { routes, loadCustomRoutes } from '../../src/routes';
import BaseRoute from '../../src/routes/base.route';
import UsersRoute from '../../src/routes/users.route';
import BaseController from '../../src/controllers/base.controller';
import { signAuthToken } from '../../src/utils/jwt.util';
import { logger } from '../../src/utils/logger.util';

const env = { ...process.env };
const service = BaseController.baseService as any;

describe('chargeur de routes', () => {
  it('charge users.route puis la route générique en dernier', () => {
    expect(routes.map(r => r.constructor.name)).toEqual(['UsersRoute', 'BaseRoute']);
  });

  it('ne garde que les *.route.(ts|js) hors base.*, exportant une classe', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
    fs.writeFileSync(path.join(dir, 'a.route.js'), 'module.exports = class A { constructor() { this.router = "a"; } };');
    fs.writeFileSync(path.join(dir, 'b.route.js'), 'exports.default = class B { constructor() { this.router = "b"; } };');
    fs.writeFileSync(path.join(dir, 'c.route.js'), 'module.exports = { notAClass: true };');
    fs.writeFileSync(path.join(dir, 'base.route.js'), 'throw new Error("ne doit pas être chargé");');
    fs.writeFileSync(path.join(dir, 'helper.js'), 'throw new Error("ne doit pas être chargé");');
    expect(loadCustomRoutes(dir).map(r => r.router)).toEqual(['a', 'b']);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('UsersRoute déclare register et login', () => {
    const paths = (new UsersRoute().router as any).stack.map((l: any) => `${Object.keys(l.route.methods)[0]} ${l.route.path}`);
    expect(paths).toEqual(['post /users/register', 'post /users/login']);
  });
});

describe('App (sans base de données)', () => {
  let app: App;
  beforeAll(() => { app = new App(routes, false); });
  afterEach(() => { jest.restoreAllMocks(); process.env = { ...env }; });

  it('CRUD générique : 403 sur un modèle bloqué avant la validation', async () => {
    const res = await request(app.app).post('/users').send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not exposed/);
  });

  it('CRUD générique : délègue au service pour un modèle exposé', async () => {
    jest.spyOn(service, 'findAllDatas').mockResolvedValue([{ id: 1 }]);
    const res = await request(app.app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ datas: [{ id: 1 }] });
  });

  it('valide le corps avant la création (400)', async () => {
    const create = jest.spyOn(service, 'createData');
    const res = await request(app.app).post('/products').send({ productName: 1 });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('GENERIC_CRUD_AUTH : 401 sans token, 200 avec un token valide', async () => {
    process.env.GENERIC_CRUD_AUTH = 'true';
    jest.spyOn(service, 'findDataById').mockResolvedValue({ id: 1 });
    expect((await request(app.app).get('/products/1')).status).toBe(401);
    jest.spyOn(BaseRoute.userModel, 'findByPk').mockResolvedValue({ id: 1 } as any);
    const { token } = signAuthToken({ id: 1, username: 'a' });
    const res = await request(app.app).get('/products/1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('sert Swagger UI localement (sans CDN)', async () => {
    const res = await request(app.app).get('/swagger/api-docs/').redirects(1);
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
    expect(res.text).not.toMatch(/https?:\/\/(cdn|unpkg)/);
  });

  it('connectToDatabase : authenticate, puis sync seulement si DB_SYNC=true', async () => {
    const auth = jest.spyOn(DB.sequelize, 'authenticate').mockResolvedValue();
    const sync = jest.spyOn(DB.sequelize, 'sync').mockResolvedValue(DB.sequelize);
    await app.connectToDatabase();
    expect(auth).toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
    process.env.DB_SYNC = 'true';
    process.env.DB_SYNC_ALTER = 'true';
    await app.connectToDatabase();
    expect(sync).toHaveBeenCalledWith({ alter: true });
  });

  it('se connecte à la base dès le constructeur par défaut', () => {
    const connect = jest.spyOn(App.prototype, 'connectToDatabase').mockResolvedValue();
    new App([], true);
    new App([]);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('configuration production (PORT, CORS, morgan combined)', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '4567';
    const prod = new App([], false);
    expect(prod.port).toBe(4567);
    expect(prod.env).toBe('production');
    delete process.env.PORT; delete process.env.NODE_ENV;
    const dev = new App([], false);
    expect(dev.port).toBe(3000);
    expect(dev.env).toBe('development');
  });

  it('listen : démarre une fois, journalise les erreurs serveur', () => {
    const info = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    const error = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    const server: any = new EventEmitter();
    const listen = jest.spyOn(app.app, 'listen').mockImplementation(((_port: any, cb: () => void) => { cb(); server.listening = true; return server; }) as any);
    App.server = undefined as any;
    app.listen();
    app.listen();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(expect.stringContaining('already running'));
    server.emit('error', Object.assign(new Error('x'), { code: 'EADDRINUSE' }));
    server.emit('error', new Error('other'));
    server.emit('error', {});
    expect(error.mock.calls.map(c => c[0])).toEqual([
      expect.stringContaining('already in use'), 'Server error: other', 'Server error: [object Object]',
    ]);
    App.server = undefined as any;
  });
});
