require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

const shared = {
  username: requireEnv('DB_USERNAME'),
  password: requireEnv('DB_PASSWORD'),
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
