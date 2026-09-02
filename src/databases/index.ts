import path from 'path';
process.env['NODE_CONFIG_DIR'] = process.env['NODE_CONFIG_DIR'] || path.resolve(process.cwd(), 'config');

import config from 'config';
import { Sequelize } from 'sequelize';
import { dbConfig } from '../interfaces/db.interface';
import { logger } from '../utils/logger.util';
import { initModels } from '../models/init-models';

const configDB = config.get('dbConfig') as dbConfig;
const { host, user, password, database, pool, port }: dbConfig = configDB;

const sequelize = new Sequelize(database, user, password, {
  host,
  dialect: (process.env.DB_DIALECT as any) || 'mysql',
  timezone: '+01:00',
  port,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    freezeTableName: true,
  },
  pool: {
    min: pool.min,
    max: pool.max,
  },
  logQueryParameters: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'test' ? false : (query, time) => {
    logger.info(`${time}ms ${query}`);
  },
  benchmark: process.env.NODE_ENV !== 'test',
});

const DB = {
  Models: initModels(sequelize),
  sequelize,
  Sequelize,
};

export default DB;
