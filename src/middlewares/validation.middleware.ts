import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { RequestHandler } from 'express';
import HttpException from '../exceptions/HttpException';
import { dtos, DtoKeys, createDtos } from '../dtos/index';
import { extractModelFromPath } from '../utils/modelAccess.util';

const validationMiddleware = (
  value: 'body' | 'query' | 'params' = 'body',
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true,
): RequestHandler => {
  return async (req, _res, next) => {
    const modelName = (req.params.model ? req.params.model.toLowerCase() : extractModelFromPath(req.path)) as DtoKeys;
    const dtosType = value === 'body' ? createDtos : dtos;

    if (!dtosType[modelName]) {
      return next(new HttpException(400, `No DTO found for model ${modelName}`));
    }

    const dtoClass = dtosType[modelName] as ClassConstructor<any>;
    const dtoInstance = plainToInstance(dtoClass, req[value]);
    const errors: ValidationError[] = await validate(dtoInstance, { skipMissingProperties, whitelist, forbidNonWhitelisted });

    if (errors.length === 0) return next();

    const errorMessages = errors.map((error: ValidationError) => Object.values(error.constraints || {}).join(', ')).join(', ');

    if (errorMessages.includes('must be a Date instance')) {
      for (const error of errors) {
        if (Object.values(error.constraints || {}).some(msg => msg.includes('must be a Date instance'))) {
          const raw = req[value][error.property];
          if (raw === 'Invalid Date') return next(new HttpException(400, `${error.property} is an invalid date`));
          req[value][error.property] = new Date(raw);
        }
      }
      const reErrors: ValidationError[] = await validate(plainToInstance(dtoClass, req[value]), { skipMissingProperties, whitelist, forbidNonWhitelisted });
      if (reErrors.length > 0) {
        const reErrorMessages = reErrors.map((error: ValidationError) => Object.values(error.constraints || {}).join(', ')).join(', ');
        return next(new HttpException(400, reErrorMessages));
      }
      return next();
    }

    return next(new HttpException(400, errorMessages));
  };
};

export default validationMiddleware;
