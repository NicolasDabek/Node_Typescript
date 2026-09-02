import { NextFunction, Response } from 'express';
import HttpException from '../exceptions/HttpException';
import { RequestWithUser } from '../interfaces/auth.interface';
import BaseRoute from '../routes/base.route';
import { Model } from 'sequelize';
import { verifyAuthToken } from '../utils/jwt.util';

const authMiddleware = async (req: RequestWithUser<Model>, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied, no token provided.' });

    const tokenVerified = verifyAuthToken(token);
    const findedUser = await BaseRoute.userModel.findByPk(tokenVerified.id);
    if (!findedUser) return next(new HttpException(401, 'Wrong authentication token'));

    req.user = findedUser;
    next();
  } catch {
    next(new HttpException(401, 'Wrong authentication token'));
  }
};

export default authMiddleware;
