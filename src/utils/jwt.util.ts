import jwt from 'jsonwebtoken';
import { DataStoredInToken, TokenData } from '../interfaces/auth.interface';

/** Algorithme unique, imposé à la signature ET à la vérification (pas de « alg » choisi par le token). */
export const JWT_ALGORITHM = 'HS256' as const;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

export function signAuthToken(payload: DataStoredInToken, expiresInSeconds = 3600): TokenData {
  return {
    token: jwt.sign({ ...payload }, getJwtSecret(), { expiresIn: expiresInSeconds, algorithm: JWT_ALGORITHM }),
    expiresIn: expiresInSeconds,
  };
}

export function verifyAuthToken(token: string): DataStoredInToken {
  return jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] }) as DataStoredInToken;
}
