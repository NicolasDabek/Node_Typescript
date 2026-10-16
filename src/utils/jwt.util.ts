import jwt from 'jsonwebtoken';
import { DataStoredInToken, TokenData } from '../interfaces/auth.interface';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

export function signAuthToken(payload: DataStoredInToken, expiresInSeconds = 3600): TokenData {
  return {
    token: jwt.sign({ ...payload }, getJwtSecret(), { expiresIn: expiresInSeconds }),
    expiresIn: expiresInSeconds,
  };
}

export function verifyAuthToken(token: string): DataStoredInToken {
  return jwt.verify(token, getJwtSecret()) as DataStoredInToken;
}
