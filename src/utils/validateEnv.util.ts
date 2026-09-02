import { cleanEnv, port, str, num, bool } from 'envalid';

export function validateEnv() {
  cleanEnv(process.env, {
    NODE_ENV: str({ default: 'development' }),
    PORT: port({ default: 3000 }),
    JWT_SECRET: str({ default: 'change-me-in-production' }),
    SECRET_SESSION: str({ default: 'change-me-in-production' }),
    USER_PASSWORD_HASH_SALT: num({ default: 10 }),
    DB_SYNC: bool({ default: false }),
  });
}
