import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadOverrides, assertCrudAccess, getBlockedModels, isModelExposed, normalizeModelName, resolveCrudModel } from '../../src/crud/registry';
import { assertModelAccessible, extractModelFromPath } from '../../src/utils/modelAccess.util';
import { SequelizeUtil } from '../../src/utils/sequelize.util';
import usersCrud from '../../src/crud/overrides/users.crud';
import DB from '../../src/databases';

jest.mock('../../src/utils/password.util', () => ({ hashPassword: jest.fn(async (p: string) => `hashed:${p}`) }));

const env = { ...process.env };
afterEach(() => { process.env = { ...env }; });

describe('registre CRUD : règles d’exposition', () => {
  it('normalise les noms', () => {
    expect(normalizeModelName('  Products ')).toBe('products');
    expect(normalizeModelName()).toBe('');
  });

  it('bloque users par défaut, liste vide si CRUD_BLOCKED_MODELS=""', () => {
    expect(getBlockedModels()).toEqual(['users']);
    process.env.CRUD_BLOCKED_MODELS = ' A, b ,,';
    expect(getBlockedModels()).toEqual(['a', 'b']);
    process.env.CRUD_BLOCKED_MODELS = '';
    expect(getBlockedModels()).toEqual([]);
    expect(isModelExposed('users')).toBe(true);
  });

  it('valeurs par défaut sans surcharge', () => {
    expect(resolveCrudModel('PRODUCTS')).toEqual({
      name: 'products', exposed: true, auth: false,
      operations: ['list', 'read', 'field', 'search', 'create', 'update', 'delete'], hiddenFields: [], hooks: {},
    });
  });

  it('isModelExposed refuse un nom vide', () => {
    expect(isModelExposed('')).toBe(false);
    expect(isModelExposed('products')).toBe(true);
  });

  it('assertCrudAccess : 400 sans nom, 403 si bloqué ou opération interdite', () => {
    expect(() => assertCrudAccess('')).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => assertCrudAccess('users', 'list')).toThrow(expect.objectContaining({ status: 403 }));
    expect(assertCrudAccess('products', 'delete').name).toBe('products');
    expect(assertCrudAccess('products').name).toBe('products');
  });
});

describe('registre CRUD : chargement des surcharges', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'overrides-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('sans dossier : aucune surcharge', () => {
    expect(loadOverrides(path.join(dir, 'absent'))).toEqual({});
  });

  it('charge *.crud.(ts|js) en export default ou module.exports, ignore le reste et les .d.ts', () => {
    fs.writeFileSync(path.join(dir, 'orders.crud.js'), "exports.default = { exposed: true, auth: true, operations: ['list'], hiddenFields: ['secret'] };");
    fs.writeFileSync(path.join(dir, 'Items.crud.js'), 'module.exports = { exposed: false };');
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'x');
    fs.writeFileSync(path.join(dir, 'types.crud.d.ts'), 'export {};');
    const loaded = loadOverrides(dir);
    expect(Object.keys(loaded).sort()).toEqual(['items', 'orders']);

    process.env.CRUD_BLOCKED_MODELS = 'orders';
    expect(resolveCrudModel('orders', loaded)).toMatchObject({ exposed: true, auth: true, operations: ['list'], hiddenFields: ['secret'] });
    expect(resolveCrudModel('items', loaded).exposed).toBe(false);
  });

  it('charge la surcharge users du projet', () => {
    expect(loadOverrides().users).toBe(usersCrud);
  });

  it('GENERIC_CRUD_AUTH et CRUD_ALLOWED_MODELS', () => {
    process.env.GENERIC_CRUD_AUTH = 'true';
    process.env.CRUD_ALLOWED_MODELS = 'products';
    process.env.CRUD_BLOCKED_MODELS = '';
    expect(resolveCrudModel('products')).toMatchObject({ exposed: true, auth: true });
    expect(resolveCrudModel('users').exposed).toBe(false);
  });
});

describe('modelAccess.util (compatibilité)', () => {
  it('extractModelFromPath et assertModelAccessible', () => {
    expect(extractModelFromPath('/Products/12')).toBe('products');
    expect(extractModelFromPath('/')).toBe('');
    expect(assertModelAccessible('Products')).toBe('products');
    expect(() => assertModelAccessible('users')).toThrow(/not exposed/);
  });
});

describe('SequelizeUtil', () => {
  it('trouve un modèle sans tenir compte de la casse, 404 sinon', () => {
    const util = new SequelizeUtil();
    expect(util.getModel('PRODUCTS')).toBe(DB.Models.products);
    expect(() => util.getModel('nope')).toThrow(expect.objectContaining({ status: 404 }));
  });
});

describe('surcharge users.crud', () => {
  it('cache le mot de passe et le hashe à la création / modification', async () => {
    expect(usersCrud.hiddenFields).toEqual(['password']);
    expect(await usersCrud.hooks!.beforeCreate!({ username: 'a', password: 'pw' })).toEqual({ username: 'a', password: 'hashed:pw' });
    expect(await usersCrud.hooks!.beforeUpdate!({ username: 'b' }, 1)).toEqual({ username: 'b' });
  });
});
