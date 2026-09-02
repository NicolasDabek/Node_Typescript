require('dotenv').config();

const shared = {
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'projet_test_nico',
  host: process.env.DB_ADDRESS || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  dialect: process.env.DB_DIALECT || 'mysql',
};

module.exports = {
  development: shared,
  test: { ...shared, database: process.env.DB_NAME_TEST || `${shared.database}_test` },
  production: shared,
};
