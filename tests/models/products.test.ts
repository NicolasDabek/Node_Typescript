import request from 'supertest';
import { app } from '../../src/index';
import { generateFakeData } from '../../generateTests';
import { products } from '../../src/models/products'

describe('Products API', () => {
  let transaction: any;
  const instanceData = generateFakeData(products.rawAttributes);
  let createdData: products;

  beforeAll(async () => {
    await app.dbSequelize.sequelize.sync({ force: true });
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

  it('should create a new products', async () => {
    const { id, ...restInstanceData } = instanceData
    const response = await request(app.app)
      .post('/products')
      .send(restInstanceData);
    createdData = response.body.datas
    expect(response.statusCode).toEqual(201);
    expect(response.body.datas).toHaveProperty('id');
  });

  it('should find a products by ID', async () => {
    const getResponse = await request(app.app)
      .get(`/products/1`)
      .expect(200);
    expect(getResponse.body.datas).toHaveProperty('id', 1);
    expect(getResponse.body.datas).toBeDefined();
  });

  it('should update an existing products', async () => {
    const updatedData = generateFakeData(products.rawAttributes);
    const { id, ...restUpdatedData } = updatedData
    const updateResponse = await request(app.app)
      .put(`/products/1`)
      .send(restUpdatedData);
    expect(updateResponse.statusCode).toEqual(200);
    expect(updateResponse.body.datas).not.toEqual(createdData);
  });

  it('should delete an existing products', async () => {
    const deleteResponse = await request(app.app)
      .delete(`/products/1`)
      .expect(200);
    expect(deleteResponse.body).toBeDefined();

    // Verify that the record no longer exists
    const getResponse = await request(app.app)
      .get(`/products/1`)
      .expect(404);
  });

  it('should return 404 for non-existent products', async () => {
    const nonExistentId = 999999;
    await request(app.app)
      .get(`/products/${nonExistentId}`)
      .expect(404);
  });
});