import { NextFunction, Response } from 'express'
import config from 'config'
import jwt from 'jsonwebtoken'
import DB from '@databases'
import HttpException from '@exceptions/HttpException'
import { DataStoredInToken, RequestWithUser } from '@interfaces/auth.interface'

const authMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction, minRole?: number) => {
  try {
    const Authorization = req.headers.authorization

    if (Authorization) {
      const secretKey: string = config.get('secretKey')
      const tokenVerified = jwt.verify(Authorization, secretKey) as DataStoredInToken
      const userId = tokenVerified.id
      const findUser = await DB.Models.users.findByPk(userId)

      if(findUser) {
        req.user = findUser
        next()
      } else {
        next(new HttpException(401, 'Wrong authentication token'))
      }
    } else {
      next(new HttpException(404, 'Authentication token missing'))
    }
  } catch (error) {
    next(new HttpException(401, 'Wrong authentication token'))
  }
}

export default authMiddleware