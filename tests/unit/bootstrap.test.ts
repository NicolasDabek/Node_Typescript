import DBReal from '../../src/databases';

describe('src/databases', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('sequelize'); });

  it('instancie Sequelize depuis la config, sans se connecter', () => {
    jest.isolateModules(() => {
      const ctor = jest.fn().mockImplementation(function (this: any) { this.define = jest.fn(); });
      const actual = jest.requireActual('sequelize');
      jest.doMock('sequelize', () => ({ ...actual, Sequelize: ctor }));
      jest.doMock('../../src/models/init-models', () => ({ initModels: jest.fn(() => ({ m: 1 })) }));
      const DB = require('../../src/databases').default;
      expect(DB.Models).toEqual({ m: 1 });
      const [database, user, password, options] = ctor.mock.calls[0];
      expect([database, user, password]).toEqual(['projet_test_nico', 'unit', 'unit']);
      expect(options).toMatchObject({ host: 'localhost', port: 1, dialect: 'mysql', logging: false, benchmark: false });
    });
  });

  it('journalise les requêtes hors environnement de test', () => {
    const env = { ...process.env };
    process.env.NODE_ENV = 'development';
    process.env.DB_DIALECT = 'mariadb';
    jest.isolateModules(() => {
      const ctor = jest.fn();
      jest.doMock('sequelize', () => ({ ...jest.requireActual('sequelize'), Sequelize: ctor }));
      jest.doMock('../../src/models/init-models', () => ({ initModels: jest.fn(() => ({})) }));
      const { logger } = require('../../src/utils/logger.util');
      const info = jest.spyOn(logger, 'info').mockImplementation(() => logger);
      require('../../src/databases');
      const options = ctor.mock.calls[0][3];
      expect(options).toMatchObject({ dialect: 'mariadb', benchmark: true, logQueryParameters: true });
      options.logging('SELECT 1', 3);
      expect(info).toHaveBeenCalledWith('3ms SELECT 1');
    });
    process.env = env;
  });
});

describe('modèles générés', () => {
  it('initModels déclare products et users avec leurs clés primaires', () => {
    const DB = DBReal;
    expect(Object.keys(DB.Models).sort()).toEqual(['products', 'users']);
    expect(DB.Models.products.primaryKeyAttribute).toBe('id');
    expect(DB.Models.users.getAttributes()).toHaveProperty('password');
  });
});

describe('src/index', () => {
  afterEach(() => jest.resetModules());

  it('en test : valide l’env et crée l’app sans se connecter ni écouter', () => {
    jest.isolateModules(() => {
      const App = require('../../src/app').default;
      const connect = jest.spyOn(App.prototype, 'connectToDatabase');
      const listen = jest.spyOn(App.prototype, 'listen');
      const { app } = require('../../src/index');
      expect(app).toBeInstanceOf(App);
      expect(connect).not.toHaveBeenCalled();
      expect(listen).not.toHaveBeenCalled();
    });
  });

  it('hors test : se connecte puis écoute', async () => {
    const env = { ...process.env };
    process.env.NODE_ENV = 'development';
    let connect!: jest.SpyInstance; let listen!: jest.SpyInstance;
    jest.isolateModules(() => {
      const App = require('../../src/app').default;
      connect = jest.spyOn(App.prototype, 'connectToDatabase').mockResolvedValue(undefined);
      listen = jest.spyOn(App.prototype, 'listen').mockImplementation(() => undefined);
      require('../../src/index');
    });
    await new Promise(setImmediate);
    expect(connect).toHaveBeenCalled();
    expect(listen).toHaveBeenCalled();
    process.env = env;
  });
});
