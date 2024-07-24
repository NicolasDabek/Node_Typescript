import config from 'config';
import Sequelize from 'sequelize';
import { dbConfig } from '@interfaces/db.interface';
import { logger } from '@utils/logger.util';
import { initModels } from '@models/init-models';

let configDB
try {
  configDB = config.get("dbConfig")
} catch (error) {
  console.error(error)
}

const { host, user, password, database, pool, port }: dbConfig = configDB
const sequelize = new Sequelize.Sequelize(database, user, password, {
  host: host,
  dialect: 'mysql',
  timezone: '+01:00',
  port: port,
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
  logging: (query, time) => {
    logger.info(time + 'ms' + ' ' + query);
  },
  benchmark: true,
});

sequelize.authenticate();

const DB = {
  Models: initModels(sequelize),
  sequelize, // connection instance (RAW queries)
  Sequelize, // library
};

export default DB;
