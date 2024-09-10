import request from 'supertest';
import { app } from '../src/index';

let fakeUser = {
  pseudo: "Joe Doe",
  email: "email@gmail.com",
  addressIP: "localhost",
  dateCreation: new Date(),
  isActive: 1,
  password: "my-pass"
};

describe('User API', () => {
  let transaction: any;

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

  it('test should create a new user', async () => {
    const res = await request(app.app)
      .post('/users')
      .send(fakeUser);
    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.pseudo).toBe(fakeUser.pseudo);
    expect(res.body.data.email).toBe(fakeUser.email);
  });

  it('test should get all users', async () => {
    const res = await request(app.app).get('/users');
    expect(res.statusCode).toEqual(200);
  });

  it('test should update a user', async () => {
    const res = await request(app.app)
      .put(`/users/1`)
      .send({ ...fakeUser, pseudo: 'John Doe' });
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.pseudo).toBe('John Doe');
  });

  it('test should delete a user', async () => {
    const res = await request(app.app).delete(`/users/1`);
    expect(res.statusCode).toEqual(200);
  });

  it('test should return 404 when user not found', async () => {
    const res = await request(app.app).get('/users/999');
    expect(res.statusCode).toEqual(404);
  });
});