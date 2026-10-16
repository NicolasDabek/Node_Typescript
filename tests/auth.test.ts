import request from 'supertest';
import { app } from '../src/index';
import { verifyAuthToken } from '../src/utils/jwt.util';

describe('Auth (register / login)', () => {
  const user = {
    username: `user_${Date.now()}`,
    password: 'S3cret-pass',
    email: 'user@example.com',
    isActive: 1,
    addressIP: '127.0.0.1',
    dateCreation: new Date().toISOString(),
  };

  afterAll(async () => {
    await app.dbSequelize.sequelize.close();
  });

  it('inscrit un utilisateur sans renvoyer le mot de passe', async () => {
    const response = await request(app.app).post('/users/register').send(user);
    expect(response.statusCode).toEqual(201);
    expect(response.body.datas).toHaveProperty('username', user.username);
    expect(response.body.datas).not.toHaveProperty('password');
  });

  it('refuse un second compte avec le même username', async () => {
    const response = await request(app.app).post('/users/register').send(user);
    expect(response.statusCode).toEqual(400);
  });

  it('connecte l’utilisateur et renvoie un JWT avec l’id à la racine', async () => {
    const response = await request(app.app).post('/users/login').send({ username: user.username, password: user.password });
    expect(response.statusCode).toEqual(200);
    const payload = verifyAuthToken(response.body.datas.token);
    expect(typeof payload.id).toBe('number');
    expect(payload.username).toBe(user.username);
  });

  it('refuse un mauvais mot de passe', async () => {
    const response = await request(app.app).post('/users/login').send({ username: user.username, password: 'wrong' });
    expect(response.statusCode).toEqual(401);
  });

  it('refuse une connexion sans identifiants', async () => {
    const response = await request(app.app).post('/users/login').send({});
    expect(response.statusCode).toEqual(400);
  });
});
