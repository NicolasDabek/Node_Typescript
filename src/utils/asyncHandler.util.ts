import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Enveloppe un handler async : toute erreur (rejet ou throw) part dans next(),
 * ce qui évite les try/catch répétés dans chaque contrôleur.
 */
export const asyncHandler = <Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
