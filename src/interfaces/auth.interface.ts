import { Request } from 'express';
import { Model } from 'sequelize';

export interface DataStoredInToken {
  id: number;
  username: string;
  role?: number;
}

export interface TokenData {
  token: string;
  expiresIn: number;
}

export interface RequestWithUser<T extends Model> extends Request {
  user: T;
}