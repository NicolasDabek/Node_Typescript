import { NextFunction, Request, Response } from 'express';
import HttpException from '../exceptions/HttpException';
import { logger } from '../utils/logger.util';

/**
 * Gestion centralisée des erreurs.
 * - HttpException : statut et message conservés.
 * - Toute autre erreur : 500 générique (le détail reste dans les logs, jamais dans la réponse).
 * Les en-têtes et le corps de la requête ne sont pas journalisés (tokens, mots de passe).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorMiddleware = (error: Error, req: Request, res: Response, _next: NextFunction) => {
  const isHttp = error instanceof HttpException;
  const status = isHttp ? error.status : 500;
  const message = isHttp ? error.message || 'Something went wrong' : 'Internal Server Error';

  if (status >= 500) logger.error(`[${req.method}] ${req.originalUrl} >> ${status} ${message} :: ${error.stack || error.message}`);
  else logger.warn(`[${req.method}] ${req.originalUrl} >> ${status} ${message}`);

  const body: Record<string, unknown> = { message };
  if (process.env.NODE_ENV === 'development') body.stack = error.stack;
  res.status(status).json(body);
};

export default errorMiddleware;
