import { DataTypes, Sequelize, Model } from 'sequelize';
import { Router } from 'express';
import { buildSwaggerDoc } from '../../src/swagger/buildDocs';
import { modelToSchemas } from '../../src/swagger/modelToSchema';
import { routes } from '../../src/routes';
import * as registry from '../../src/crud/registry';
import { ALL_CRUD_OPERATIONS } from '../../src/crud/crud.interface';
import DB from '../../src/databases';

const env = { ...process.env };
afterEach(() => { jest.restoreAllMocks(); process.env = { ...env }; });

describe('modelToSchemas', () => {
  const sequelize = new Sequelize('unit', 'u', 'p', { dialect: 'mysql', port: 1 });
  class Sample extends Model {}
  Sample.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    big: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    small: { type: DataTypes.SMALLINT },
    tiny: { type: DataTypes.TINYINT },
    medium: { type: DataTypes.MEDIUMINT },
    dec: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    flt: { type: DataTypes.FLOAT },
    dbl: { type: DataTypes.DOUBLE },
    real: { type: DataTypes.REAL },
    flag: { type: DataTypes.BOOLEAN },
    day: { type: DataTypes.DATEONLY },
    at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    kind: { type: DataTypes.ENUM('a', 'b'), comment: 'Type' },
    meta: { type: DataTypes.JSON },
    uid: { type: DataTypes.UUID },
    name: { type: DataTypes.STRING(42), allowNull: false },
    body: { type: DataTypes.TEXT },
    mail: { type: DataTypes.STRING, validate: { isEmail: true } },
    secret: { type: DataTypes.STRING, allowNull: false },
  }, { sequelize, tableName: 'sample', timestamps: false });

  it('convertit chaque type Sequelize en type OpenAPI', () => {
    const { read } = modelToSchemas(Sample as any);
    const p = read.properties as any;
    expect(p.id).toMatchObject({ type: 'integer', readOnly: true });
    for (const k of ['big', 'small', 'tiny', 'medium']) expect(p[k].type).toBe('integer');
    for (const k of ['dec', 'flt', 'dbl', 'real']) expect(p[k].type).toBe('number');
    expect(p.flag.type).toBe('boolean');
    expect(p.day).toMatchObject({ type: 'string', format: 'date' });
    expect(p.at).toMatchObject({ type: 'string', format: 'date-time' });
    expect(p.kind).toMatchObject({ type: 'string', enum: ['a', 'b'], description: 'Type' });
    expect(p.meta.type).toBe('object');
    expect(p.uid).toMatchObject({ type: 'string', format: 'uuid' });
    expect(p.name).toEqual({ type: 'string', maxLength: 42 });
    expect(p.body).toMatchObject({ type: 'string', nullable: true });
    expect(p.body).not.toHaveProperty('maxLength');
    expect(p.mail.format).toBe('email');
  });

  it('create/update : champs générés exclus, requis = non-null sans défaut, cachés en writeOnly', () => {
    const { read, create, update } = modelToSchemas(Sample as any, ['secret']);
    expect(read.properties).not.toHaveProperty('secret');
    expect(read.required).toEqual(expect.arrayContaining(['id', 'big', 'dec', 'name']));
    expect(create.properties).not.toHaveProperty('id');
    expect(create.properties).not.toHaveProperty('at');
    expect(create.required).toEqual(['dec', 'name', 'secret']);
    expect((create.properties as any).secret.writeOnly).toBe(true);
    expect(update.required).toBeUndefined();
  });

  it('omet required quand rien n’est obligatoire', () => {
    class Loose extends Model {}
    Loose.init({ note: { type: DataTypes.STRING } }, { sequelize, tableName: 'loose', timestamps: false });
    Loose.removeAttribute('id');
    const { read, create } = modelToSchemas(Loose as any);
    expect(read.required).toBeUndefined();
    expect(create.required).toBeUndefined();
  });
});

describe('buildSwaggerDoc', () => {
  const op = (doc: any, p: string, m: string) => doc.paths[p]?.[m];

  it('décline le CRUD générique pour chaque modèle exposé, routes spécifiques comprises', () => {
    const doc = buildSwaggerDoc(routes);
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.info).toMatchObject({ title: 'API Documentation', version: '1.0.0' });
    expect(doc.info.description).toContain('users');
    expect(Object.keys(doc.paths).sort()).toEqual([
      '/products', '/products/multiple/{fieldName}/{fieldVal}', '/products/onefield/{fieldName}', '/products/{id}',
      '/users/login', '/users/register',
    ]);
    expect(op(doc, '/products', 'post')).toMatchObject({ operationId: 'create_products', requestBody: { required: true } });
    expect(Object.keys(op(doc, '/products', 'post').responses)).toEqual(['201', '400', '500']);
    expect(op(doc, '/products/{id}', 'get').parameters).toEqual([{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }]);
    expect(op(doc, '/products/{id}', 'delete').responses).toHaveProperty('404');
    expect(op(doc, '/products', 'get').security).toBeUndefined();
    expect(op(doc, '/products/onefield/{fieldName}', 'get').parameters[0].schema.type).toBe('string');
    expect(op(doc, '/users/login', 'post').requestBody.content['application/json'].schema).toEqual({ $ref: '#/components/schemas/Login' });
    expect(op(doc, '/users/login', 'post').responses).toHaveProperty('401');
    expect(op(doc, '/users/register', 'post').responses).toHaveProperty('201');
    expect(op(doc, '/users/register', 'post').requestBody.content['application/json'].schema.$ref).toBe('#/components/schemas/usersCreate');
    expect(doc.components.schemas.productsCreate.required).toEqual(['productName', 'price']);
    expect(doc.tags).toEqual([{ name: 'products' }, { name: 'users', description: expect.any(String) }]);
  });

  it('reflète auth, opérations limitées, titre/version et routes sans modèle', () => {
    process.env.API_TITLE = 'Mon API';
    process.env.API_VERSION = '2.0.0';
    process.env.CRUD_BLOCKED_MODELS = '';
    const real = registry.resolveCrudModel;
    jest.spyOn(registry, 'listCrudModels').mockReturnValue([
      { ...real('products'), auth: true, operations: ['list', 'read'] },
      { ...real('users') },
      { ...real('ghost') },
    ]);
    const custom = Router();
    custom.get('/health', (_req, res) => res.end());
    custom.get('/stats/:day', (_req, res) => res.end());
    custom.post('/products/import', (_req, res) => res.end());
    custom.patch('/:model/touch', (_req, res) => res.end());
    custom.use((_req, _res, next) => next());
    const doc = buildSwaggerDoc([{ router: custom }, ...routes]) as any;

    expect(doc.info).toEqual({ title: 'Mon API', version: '2.0.0' });
    expect(op(doc, '/products', 'get').security).toEqual([{ bearerAuth: [] }]);
    expect(op(doc, '/products', 'get').responses).toHaveProperty('401');
    expect(op(doc, '/products', 'post')).toBeUndefined();
    expect(op(doc, '/users', 'post')).toBeDefined();
    expect(doc.paths['/products/touch']).toBeUndefined();
    expect(op(doc, '/health', 'get')).toMatchObject({ tags: ['health'], summary: 'GET /health' });
    expect(op(doc, '/health', 'get').responses['200'].content['application/json'].schema).toEqual({ type: 'object' });
    expect(op(doc, '/stats/{day}', 'get').parameters[0]).toMatchObject({ name: 'day' });
    expect(op(doc, '/products/import', 'post').requestBody.content['application/json'].schema.$ref).toBe('#/components/schemas/productsCreate');
    expect(doc.components.schemas).not.toHaveProperty('ghost');
  });

  it('route "/" étiquetée default, modèle sans DTO de création', () => {
    const real = registry.resolveCrudModel;
    jest.spyOn(registry, 'listCrudModels').mockReturnValue([{ ...real('extra') }]);
    (DB.Models as any).extra = DB.Models.products;
    const root = Router();
    root.get('/', (_req, res) => res.end());
    const doc = buildSwaggerDoc([{ router: root }]) as any;
    delete (DB.Models as any).extra;
    expect(op(doc, '/', 'get').tags).toEqual(['default']);
    expect(doc.components.schemas.extraCreate.required).toEqual(['productName', 'price']);
    expect(doc.components.schemas.extraCreate).toBeDefined();
  });

  it('les opérations de la route générique couvrent toutes les opérations CRUD', () => {
    const ids = Object.values(buildSwaggerDoc(routes).paths).flatMap(m => Object.values(m).map((o: any) => o.operationId)).filter(Boolean);
    expect(ids.map((id: string) => id.split('_')[0]).sort()).toEqual([...ALL_CRUD_OPERATIONS].sort());
  });
});
