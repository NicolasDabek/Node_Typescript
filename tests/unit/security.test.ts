import jwt from 'jsonwebtoken';
import { getJwtSecret, signAuthToken, verifyAuthToken } from '../../src/utils/jwt.util';
import { validateEnv } from '../../src/utils/validateEnv.util';

jest.mock('bcrypt', () => ({ hash: jest.fn(async (p: string, salt: number) => `hash(${p},${salt})`) }));
import bcrypt from 'bcrypt';
import { hashPassword } from '../../src/utils/password.util';

const env = { ...process.env };
afterEach(() => { process.env = { ...env }; });

describe('jwt.util', () => {
  it('exige JWT_SECRET', () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET is not configured.');
    expect(() => signAuthToken({ id: 1, username: 'a' })).toThrow();
  });

  it('signe et vérifie un token avec l’id à la racine', () => {
    const { token, expiresIn } = signAuthToken({ id: 7, username: 'bob' }, 60);
    expect(expiresIn).toBe(60);
    const payload = verifyAuthToken(token);
    expect(payload).toMatchObject({ id: 7, username: 'bob' });
    expect((jwt.decode(token) as any).exp - (jwt.decode(token) as any).iat).toBe(60);
  });

  it('expire par défaut après une heure', () => {
    expect(signAuthToken({ id: 1, username: 'a' }).expiresIn).toBe(3600);
  });

  it('signe en HS256 et refuse tout autre algorithme, même avec le bon secret', () => {
    const { token } = signAuthToken({ id: 1, username: 'a' });
    expect((jwt.decode(token, { complete: true }) as any).header.alg).toBe('HS256');
    const hs512 = jwt.sign({ id: 1 }, process.env.JWT_SECRET as string, { algorithm: 'HS512' });
    expect(() => verifyAuthToken(hs512)).toThrow(/invalid algorithm/);
    const none = jwt.sign({ id: 1 }, '', { algorithm: 'none' } as any);
    expect(() => verifyAuthToken(none)).toThrow();
  });

  it('refuse un token signé avec un autre secret', () => {
    const forged = jwt.sign({ id: 1 }, 'default_secret');
    expect(() => verifyAuthToken(forged)).toThrow();
  });
});

describe('validateEnv', () => {
  let exit: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    exit = jest.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as any);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { exit.mockRestore(); error.mockRestore(); });

  it('passe quand les variables obligatoires sont là', () => {
    expect(() => validateEnv()).not.toThrow();
    expect(exit).not.toHaveBeenCalled();
  });

  it.each(['JWT_SECRET', 'SECRET_SESSION', 'DB_USERNAME', 'DB_PASSWORD'])('refuse de démarrer sans %s', name => {
    delete process.env[name];
    expect(() => validateEnv()).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe('validateEnv : SESSION_ENABLED=false', () => {
  it('SECRET_SESSION n’est plus obligatoire', () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as any);
    process.env.SESSION_ENABLED = 'false';
    delete process.env.SECRET_SESSION;
    expect(() => validateEnv()).not.toThrow();
    exit.mockRestore();
  });
});

describe('hashPassword', () => {
  it('utilise USER_PASSWORD_HASH_SALT ou 10 par défaut', async () => {
    delete process.env.USER_PASSWORD_HASH_SALT;
    expect(await hashPassword('pw')).toBe('hash(pw,10)');
    process.env.USER_PASSWORD_HASH_SALT = '4';
    expect(await hashPassword('pw')).toBe('hash(pw,4)');
    expect(bcrypt.hash).toHaveBeenCalledTimes(2);
  });
});
