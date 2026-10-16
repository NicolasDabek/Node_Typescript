import request from 'supertest';
import { app } from '../../src/index';
import { generateFakeData } from '../../generators/generateTests';
import { users } from '../../src/models/users';

// Le modèle users est volontairement bloqué sur le CRUD générique
// (CRUD_BLOCKED_MODELS) : on vérifie qu'il reste inaccessible.
describe('Users API (CRUD générique bloqué)', () => {
  it('refuse la création via le CRUD générique', async () => {
    const { id, ...data } = generateFakeData(users.rawAttributes);
    const response = await request(app.app).post('/users').send(data);
    expect([401, 403]).toContain(response.statusCode);
  });

  it('refuse la lecture via le CRUD générique', async () => {
    const response = await request(app.app).get('/users/1');
    expect([401, 403]).toContain(response.statusCode);
  });
});
