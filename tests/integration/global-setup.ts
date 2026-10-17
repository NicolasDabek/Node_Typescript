// Tests d'intégration : crée les tables depuis les modèles avant toute suite (si DB_SYNC=true),
// quel que soit l'ordre d'exécution des fichiers de test.
export default async function globalSetup(): Promise<void> {
  if (process.env.DB_SYNC !== 'true') return;
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const DB = require('../../src/databases').default;
  await DB.sequelize.sync();
  await DB.sequelize.close();
}
