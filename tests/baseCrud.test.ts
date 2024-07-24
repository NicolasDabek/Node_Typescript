import request from 'supertest';
import { app } from '../src/index'; 
import DB from '@databases';
import supertest from 'supertest';

const userData = {
  pseudo: 'testuser',
  password: 'testpassword',
  email: 'testuser@example.com',
  isActive: true,
  addressIP: '127.0.0.1',
  dateCreation: new Date().toISOString()
};

const testCRUD = (modelName: string, model: any, sampleData: Object) => {
  describe(`CRUD operations for ${modelName}`, () => {
    let itemId: number;

    afterAll(() => {
      app.server.close(); // Réinitialiser la base de données
    });

    it(`should create a new ${modelName}`, async () => {
      const response = await supertest(app.server)
        .post(`/${modelName.toLowerCase()}s`)
        .set('Content-Type', 'application/json')
        .send(sampleData)
        .expect(201);

      console.log("response", response.body["data"]);

      expect(response.body["data"]).toHaveProperty('id');
      itemId = response.body["data"].id;
    });

    it(`should retrieve all ${modelName}s`, async () => {
      await model.create(sampleData); // Créer un exemple pour le test

      const response = await supertest(app.server)
        .get(`/${modelName.toLowerCase()}s`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it(`should retrieve a single ${modelName} by ID`, async () => {
      const createdItem = await model.create(sampleData);
      itemId = createdItem.id;

      const response = await request(app.server)
        .get(`/${modelName.toLowerCase()}s/${itemId}`)
        .expect(200);

      expect(response.body["data"]).toMatchObject(sampleData);
    });

    it(`should update a ${modelName} by ID`, async () => {
      const createdItem = await model.create(sampleData);
      itemId = createdItem.id;

      const updatedData = { ...sampleData, pseudo: 'Updated User' };
      const response = await request(app.server)
        .put(`/${modelName.toLowerCase()}s/${itemId}`)
        .send(updatedData)
        .expect(200);

      expect(response.body["data"].pseudo).toBe('Updated User');
    });

    it(`should delete a ${modelName} by ID`, async () => {
      const createdItem = await model.create(sampleData);
      itemId = createdItem.id;

      await request(app.server)
        .delete(`/${modelName.toLowerCase()}s/${itemId}`)
        .expect(204);

      await request(app.server)
        .get(`/${modelName.toLowerCase()}s/${itemId}`)
        .expect(404);
    });
  });
};

describe('Generic CRUD tests', () => {
  testCRUD('User', DB.Models.users, userData);
});
