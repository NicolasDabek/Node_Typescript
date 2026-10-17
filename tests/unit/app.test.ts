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

  const bearer = () => {
    jest.spyOn(BaseRoute.userModel, 'findByPk').mockResolvedValue({ id: 1 } as any);
    return `Bearer ${signAuthToken({ id: 1, username: 'a' }).token}`;
  };

  it('CRUD générique : délègue au service pour un modèle exposé (avec JWT)', async () => {
    jest.spyOn(service, 'findAllDatas').mockResolvedValue([{ id: 1 }]);
    const res = await request(app.app).get('/products').set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ datas: [{ id: 1 }] });
  });

  it('valide le corps avant la création (400)', async () => {
    const create = jest.spyOn(service, 'createData');
    const res = await request(app.app).post('/products').set('Authorization', bearer()).send({ productName: 1 });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('JWT exigé par défaut : 401 sans token en lecture comme en écriture, sans toucher au service', async () => {
    const spies = ['findAllDatas', 'findDataById', 'createData', 'updateData', 'deleteData'].map(m => jest.spyOn(service, m));
    expect((await request(app.app).get('/products')).status).toBe(401);
    expect((await request(app.app).get('/products/1')).status).toBe(401);
    expect((await request(app.app).post('/products').send({ productName: 'p', price: 1 })).status).toBe(401);
    expect((await request(app.app).put('/products/1').send({ price: 1 })).status).toBe(401);
    expect((await request(app.app).delete('/products/1')).status).toBe(401);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('GENERIC_CRUD_PUBLIC_READ=true : lecture anonyme, écriture toujours protégée', async () => {
    process.env.GENERIC_CRUD_PUBLIC_READ = 'true';
    jest.spyOn(service, 'findDataById').mockResolvedValue({ id: 1 });
    const del = jest.spyOn(service, 'deleteData');
    expect((await request(app.app).get('/products/1')).status).toBe(200);
    expect((await request(app.app).delete('/products/1')).status).toBe(401);
    expect(del).not.toHaveBeenCalled();
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
    process.env.SESSION_ENABLED = 'false';
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

describe('App : CORS, sessions, Swagger', () => {
  afterEach(() => { jest.restoreAllMocks(); process.env = { ...env }; });

  it('CORS : aucune origine autorisée par défaut', async () => {
    const res = await request(new App([], false).app).get('/x').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('CORS : seulement les origines de CORS_ORIGINS, avec credentials', async () => {
    process.env.CORS_ORIGINS = 'https://a.example, https://b.example';
    const app = new App([], false).app;
    const ok = await request(app).get('/x').set('Origin', 'https://b.example');
    expect(ok.headers['access-control-allow-origin']).toBe('https://b.example');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const ko = await request(app).get('/x').set('Origin', 'https://evil.example');
    expect(ko.headers['access-control-allow-origin']).toBeUndefined();
  });

  const sessionRouter = () => {
    const router = require('express').Router();
    router.get('/login-session', (req: any, res: any) => { req.session.n = 1; res.end(); });
    return { router };
  };

  it('cookie de session : nom personnalisable, httpOnly, sameSite=lax, non secure hors production', async () => {
    const res = await request(new App([sessionRouter()], false).app).get('/login-session');
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^sid=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).not.toMatch(/Secure/);
    process.env.SESSION_COOKIE_NAME = 'app.sid';
    const named = await request(new App([sessionRouter()], false).app).get('/login-session');
    expect(String(named.headers['set-cookie'])).toMatch(/^app\.sid=/);
  });

  it('production : refuse le MemoryStore, cookie Secure avec un store fourni (TRUST_PROXY)', async () => {
    process.env.NODE_ENV = 'production';
    expect(() => new App([], false)).toThrow(/store/);
    process.env.TRUST_PROXY = 'true';
    const { MemoryStore } = require('express-session');
    const app = new App([sessionRouter()], false, { sessionStore: new MemoryStore() }).app;
    expect(app.get('trust proxy')).toBe(1);
    const res = await request(app).get('/login-session').set('X-Forwarded-Proto', 'https');
    expect(String(res.headers['set-cookie'])).toMatch(/Secure/);
    process.env.TRUST_PROXY = 'loopback';
    expect(new App([], false, { sessionStore: new MemoryStore() }).app.get('trust proxy')).toBe('loopback');
  });

  it('SESSION_ENABLED=false : pas de session (ni store requis en production)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_ENABLED = 'false';
    const res = await request(new App([{ router: require('express').Router().get('/s', (req: any, res: any) => res.json({ s: !!req.session })) }], false).app).get('/s');
    expect(res.body).toEqual({ s: false });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('Swagger : désactivé en production sauf SWAGGER_ENABLED=true, désactivable ailleurs', async () => {
    const swagger = async () => (await request(new App([], false, { sessionStore: new (require('express-session').MemoryStore)() }).app).get('/swagger/api-docs/')).status;
    expect(await swagger()).toBe(200);
    process.env.SWAGGER_ENABLED = 'false';
    expect(await swagger()).toBe(404);
    process.env.NODE_ENV = 'production';
    delete process.env.SWAGGER_ENABLED;
    expect(await swagger()).toBe(404);
    process.env.SWAGGER_ENABLED = 'true';
    expect(await swagger()).toBe(200);
  });
});
