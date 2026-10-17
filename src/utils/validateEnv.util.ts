import { cleanEnv, port, str, num, bool } from 'envalid';

export function validateEnv() {
  cleanEnv(process.env, {
    NODE_ENV: str({ default: 'development' }),
    PORT: port({ default: 3000 }),
    JWT_SECRET: str({ desc: 'Secret de signature des JWT (obligatoire)' }),
    // Obligatoire tant que les sessions sont actives (SESSION_ENABLED !== 'false').
    SECRET_SESSION: process.env.SESSION_ENABLED === 'false' ? str({ default: '' }) : str({ desc: 'Secret des sessions (obligatoire)' }),
    DB_USERNAME: str({ desc: 'Utilisateur de la base (obligatoire)' }),
    DB_PASSWORD: str({ desc: 'Mot de passe de la base (obligatoire)' }),
    USER_PASSWORD_HASH_SALT: num({ default: 10 }),
    DB_SYNC: bool({ default: false }),
  });
}
