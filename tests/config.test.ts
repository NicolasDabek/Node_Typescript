const config = require('config');

describe('Configuration tests', () => {
  it('should load the dbConfig correctly', () => {
    const dbConfig = config.get('dbConfig');
    expect(dbConfig).toHaveProperty('host', 'localhost');
    expect(dbConfig).toHaveProperty('database', 'projet_test_nico');
  });
});
