import { NextFunction, Request, Response } from 'express';
import HttpException from '../exceptions/HttpException';
import { logger } from '../utils/logger.util';

const errorMiddleware = (error: HttpException, req: Request, res: Response, next: NextFunction) => {
  try {
    const status: number = error.status || 500;
    const message: string = error.message || 'Something went wrong';
    logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}, Headers:: ${JSON.stringify(req.headers)}, Body:: ${JSON.stringify(req.body)}`);

    if (process.env.NODE_ENV === 'development') {
      res.status(status).json({ message, stack: error.stack });
    } else {
      res.status(status).json({ message });
    }
  } catch (loggingError) {
    logger.error('Error handling error: ', loggingError);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export default errorMiddleware;