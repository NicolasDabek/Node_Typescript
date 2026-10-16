import request from 'supertest';
import { app } from '../../src/index';
import { routes } from '../../src/routes';
import { buildSwaggerDoc } from '../../src/swagger/buildDocs';

describe('Documentation OpenAPI', () => {
  const doc = buildSwaggerDoc(routes);

  afterAll(async () => {
    await app.dbSequelize.sequelize.close();
  });

  it('documente le CRUD des modèles exposés avec schémas et codes d’erreur', () => {
    expect(doc.paths['/products']).toHaveProperty('get');
    expect(doc.paths['/products']).toHaveProperty('post');
    expect(doc.paths['/products/{id}']).toHaveProperty('put');
    expect(doc.components.schemas).toHaveProperty('products');
    expect(doc.components.schemas).toHaveProperty('productsCreate');
    const put = doc.paths['/products/{id}'].put as any;
    expect(Object.keys(put.responses)).toEqual(expect.arrayContaining(['200', '400', '404', '500']));
    expect(doc.components.securitySchemes).toHaveProperty('bearerAuth');
  });

  it('exclut les modèles bloqués du CRUD générique mais garde leurs routes spécifiques', () => {
    expect(doc.paths['/users']).toBeUndefined();
    expect(doc.paths['/users/login']).toHaveProperty('post');
    expect((doc.components.schemas.users as any).properties).not.toHaveProperty('password');
  });

  it('sert Swagger UI depuis node_modules, sans CDN', async () => {
    const res = await request(app.app).get('/swagger/api-docs/');
    expect(res.statusCode).toBe(200);
    expect(res.text).not.toMatch(/https?:\/\/(cdn|unpkg|cdnjs|jsdelivr)/i);
    const asset = await request(app.app).get('/swagger/api-docs/swagger-ui-bundle.js');
    expect(asset.statusCode).toBe(200);
  });
});
