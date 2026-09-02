import config from 'config';
import jwt from 'jsonwebtoken';
import { DataStoredInToken, TokenData } from '../interfaces/auth.interface';

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || (config.has('secretKey') ? config.get('secretKey') : '') || '';
}

export function signAuthToken(payload: DataStoredInToken, expiresInSeconds = 3600): TokenData {
  const secret = getJwtSecret();
  if (!secret) throw new Error('JWT secret is not configured.');
  return {
    token: jwt.sign(payload, secret, { expiresIn: expiresInSeconds }),
    expiresIn: expiresInSeconds,
  };
}

export function verifyAuthToken(token: string): DataStoredInToken {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as DataStoredInToken;
}
