import request from 'supertest';
import { app } from '../../src/index';
import { generateFakeData } from '../../generators/generateTests';
import { users } from '../../src/models/users';

describe('Users API', () => {
  let transaction: any;
  const instanceData = generateFakeData(users.rawAttributes);
  let createdData: users;

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

  it('should create a new users', async () => {
    const { id, ...restInstanceData } = instanceData;
    const response = await request(app.app)
      .post('/users')
      .send(restInstanceData);
    createdData = response.body.datas;
    expect(response.statusCode).toEqual(201);
    expect(response.body.datas).toHaveProperty('id');
  });

  it('should find a users by ID', async () => {
    const idCreatedData = createdData.id;
    const getResponse = await request(app.app)
      .get(`/users/${idCreatedData}`)
      .expect(200);
    expect(getResponse.body.datas).toHaveProperty('id', idCreatedData);
    expect(getResponse.body.datas).toMatchObject(createdData);
  });

  it('should update an existing users', async () => {
    const idCreatedData = createdData.id;
    const updatedData = generateFakeData(users.rawAttributes);
    const { id, ...restUpdatedData } = updatedData;
    const updateResponse = await request(app.app)
      .put(`/users/${idCreatedData}`)
      .send(restUpdatedData);
    expect(updateResponse.statusCode).toEqual(200);
    expect(updateResponse.body.datas).not.toEqual(createdData);
    createdData = updateResponse.body.datas;
  });

  it('should delete an existing users', async () => {
    const idCreatedData = createdData.id;
    await request(app.app)
      .delete(`/users/${idCreatedData}`)
      .expect(200);

    await request(app.app)
      .get(`/users/${idCreatedData}`)
      .expect(404);
  });

  it('should return 404 for non-existent users', async () => {
    const nonExistentId = 999999;
    await request(app.app)
      .get(`/users/${nonExistentId}`)
      .expect(404);
  });
});