import bcrypt from 'bcrypt';

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, parseInt(process.env.USER_PASSWORD_HASH_SALT || '10', 10));
