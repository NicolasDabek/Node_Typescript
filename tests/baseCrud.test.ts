import request from 'supertest';
import { app } from '../src/index';
import DB from '@databases';

const userData = {
  pseudo: 'testuser',
  password: 'testpassword',
  email: 'testuser@example.com',
  isActive: true,
  addressIP: '127.0.0.1',
  dateCreation: new Date().toISOString().slice(0, -4) + "000Z"
};

const testCRUD = (modelName, model, sampleData) => {
  describe(`CRUD operations for ${modelName}`, () => {
    let itemId;

    beforeAll(done => {
      // Start the server and wait for it to be ready
      app.server.on("connect", async () => {
        console.log('Server is listening');
        await DB.sequelize.sync({ force: true });
        done();
      });

      app.server.on('error', err => {
        console.error('Server encountered an error:', err);
        done(err);
      });
    });

    afterAll(done => { 
      // Close the server and wait for it to close
      app.server.close(() => {
        console.log('Server has been closed');
        DB.sequelize.close();
        done();
      });
    });

    it(`should create a new ${modelName}`, async () => {
      const response = await request(app.server)
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

      const response = await request(app.server)
        .get(`/${modelName.toLowerCase()}s`)
        .expect(200);

      expect(response.body["datas"].length).toBeGreaterThanOrEqual(1);
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
        .expect(200);

      await request(app.server)
        .get(`/${modelName.toLowerCase()}s/${itemId}`)
        .expect(404);
    });
  });
};

describe('Generic CRUD tests', () => {
  testCRUD('User', DB.Models.users, userData);
});
