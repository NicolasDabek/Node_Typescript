import { assertCrudAccess, resolveCrudModel, listCrudModels } from '../../src/crud/registry';

describe('Registre CRUD', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('bloque users par défaut et masque son mot de passe', () => {
    delete process.env.CRUD_BLOCKED_MODELS;
    const users = resolveCrudModel('users');
    expect(users.exposed).toBe(false);
    expect(users.hiddenFields).toContain('password');
    expect(() => assertCrudAccess('users')).toThrow(/not exposed/);
  });

  it('respecte CRUD_BLOCKED_MODELS et CRUD_ALLOWED_MODELS', () => {
    process.env.CRUD_BLOCKED_MODELS = 'products';
    expect(resolveCrudModel('products').exposed).toBe(false);
    process.env.CRUD_BLOCKED_MODELS = '';
    process.env.CRUD_ALLOWED_MODELS = 'users';
    expect(resolveCrudModel('products').exposed).toBe(false);
    expect(resolveCrudModel('users').exposed).toBe(true);
  });

  it('applique GENERIC_CRUD_AUTH et liste tous les modèles', () => {
    process.env.GENERIC_CRUD_AUTH = 'true';
    expect(resolveCrudModel('products').auth).toBe(true);
    expect(listCrudModels().map(m => m.name).sort()).toEqual(['products', 'users']);
  });
});
