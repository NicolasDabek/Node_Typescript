import { Request } from 'express';
import { users } from '@models/users';

export interface DataStoredInToken {
  id: number
  mail: string
  role?: number
}

export interface TokenData {
  token: string
  expiresIn: number
}

export interface RequestWithUser extends Request {
  user: users
}