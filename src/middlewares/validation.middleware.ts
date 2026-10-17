import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { RequestHandler } from 'express';
import HttpException from '../exceptions/HttpException';
import { dtos, DtoKeys, createDtos } from '../dtos/index';
import { modelNameFromPath } from '../crud/registry';

const DATE_ERROR = 'must be a Date instance';

const formatErrors = (errors: ValidationError[]): string =>
  errors.map(error => Object.values(error.constraints || {}).join(', ')).join(', ');

/**
 * Valide req[value] avec le DTO du modèle (DTO de création pour le body, DTO complet sinon).
 * Les dates envoyées en chaîne ISO sont converties en Date avant une seconde validation.
 */
const validationMiddleware = (
  value: 'body' | 'query' | 'params' = 'body',
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true,
): RequestHandler => {
  const options = { skipMissingProperties, whitelist, forbidNonWhitelisted };

  return async (req, _res, next) => {
    try {
      const modelName = (req.params.model ? req.params.model.toLowerCase() : modelNameFromPath(req.path)) as DtoKeys;
      const dtoClass = (value === 'body' ? createDtos : dtos)[modelName] as ClassConstructor<object> | undefined;
      if (!dtoClass) throw new HttpException(400, `No DTO found for model ${modelName}`);

      const data = req[value];
      let errors = await validate(plainToInstance(dtoClass, data), options);
      if (errors.length === 0) return next();

      const dateErrors = errors.filter(error => Object.values(error.constraints || {}).some(msg => msg.includes(DATE_ERROR)));
      if (dateErrors.length === 0) throw new HttpException(400, formatErrors(errors));

      for (const error of dateErrors) {
        const raw = data[error.property];
        const date = new Date(raw);
        if (raw === 'Invalid Date' || isNaN(date.getTime())) throw new HttpException(400, `${error.property} is an invalid date`);
        data[error.property] = date;
      }
      errors = await validate(plainToInstance(dtoClass, data), options);
      if (errors.length > 0) throw new HttpException(400, formatErrors(errors));
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validationMiddleware;
