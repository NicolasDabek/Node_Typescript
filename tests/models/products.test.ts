import request from 'supertest';
import { app } from '../../src/index';
import { generateFakeData } from '../../generators/generateTests';
import { products } from '../../src/models/products';
import { authHeader } from '../helpers/auth';

describe('Products API', () => {
  let auth: string;
  let transaction: any;
  const instanceData = generateFakeData(products.rawAttributes);
  let createdData: products;

  beforeAll(async () => {
    await app.dbSequelize.sequelize.sync({ force: true });
    auth = await authHeader();
  });

  beforeEach(async () => {
    transaction = await app.dbSequelize.sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  afterAll(async () => {
    await app.dbSequelize.sequelize.close();
  });

  it('should reject anonymous access to products', async () => {
    const { id, ...restInstanceData } = instanceData;
    await request(app.app).post('/products').send(restInstanceData).expect(401);
    await request(app.app).get('/products').expect(401);
  });

  it('should create a new products', async () => {
    const { id, ...restInstanceData } = instanceData;
    const response = await request(app.app)
      .post('/products')
      .set('Authorization', auth)
      .send(restInstanceData);
    createdData = response.body.datas;
    expect(response.statusCode).toEqual(201);
    expect(response.body.datas).toHaveProperty('id');
  });

  it('should find a products by ID', async () => {
    const idCreatedData = createdData.id;
    const getResponse = await request(app.app)
      .get(`/products/${idCreatedData}`)
      .set('Authorization', auth)
      .expect(200);
    expect(getResponse.body.datas).toHaveProperty('id', idCreatedData);
    // Les champs numériques (DECIMAL...) peuvent être renvoyés en chaîne par mysql2 : on les compare en nombre
    const { price, ...rest } = createdData as any;
    expect(getResponse.body.datas).toMatchObject(rest);
    expect(Number(getResponse.body.datas.price)).toBeCloseTo(Number(price));
  });

  it('should update an existing products', async () => {
    const idCreatedData = createdData.id;
    const updatedData = generateFakeData(products.rawAttributes);
    const { id, ...restUpdatedData } = updatedData;
    const updateResponse = await request(app.app)
      .put(`/products/${idCreatedData}`)
      .set('Authorization', auth)
      .send(restUpdatedData);
    expect(updateResponse.statusCode).toEqual(200);
    expect(updateResponse.body.datas).not.toEqual(createdData);
    createdData = updateResponse.body.datas;
  });

  it('should delete an existing products', async () => {
    const idCreatedData = createdData.id;
    await request(app.app)
      .delete(`/products/${idCreatedData}`)
      .set('Authorization', auth)
      .expect(200);

    await request(app.app)
      .get(`/products/${idCreatedData}`)
      .set('Authorization', auth)
      .expect(404);
  });

  it('should return 404 for non-existent products', async () => {
    const nonExistentId = 999999;
    await request(app.app)
      .get(`/products/${nonExistentId}`)
      .set('Authorization', auth)
      .expect(404);
  });
});
