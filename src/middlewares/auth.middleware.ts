import { NextFunction, Response } from 'express'
import config from 'config'
import jwt from 'jsonwebtoken'
import DB from '@databases'
import HttpException from '@exceptions/HttpException'
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface'

const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ error: 'Access denied, no token provided.' });
    }
    else {
      const secretKey: string = config.get('secretKey')
      const tokenVerified = jwt.verify(token, secretKey) as DataStoredInToken
      const userId = tokenVerified.id
      const findedUser = await DB.Models.users.findByPk(userId)

      if(findedUser) {
        req.user = findedUser
        next()
      } else {
        next(new HttpException(401, 'Wrong authentication token'))
      }
    }
  } catch (error) {
    next(new HttpException(401, 'Wrong authentication token'))
  }
}

export default authMiddleware