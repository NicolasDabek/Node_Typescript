import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { RequestHandler } from 'express';
import HttpException from '../exceptions/HttpException';
import { dtos, DtoKeys, createDtos } from '../dtos/index';

const validationMiddleware = (
  value: 'body' | 'query' | 'params' = 'body',
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true,
): RequestHandler => {
  return async (req, res, next) => {
    const tableName = req.params.model?.toLowerCase() as DtoKeys;
    const dtosType = value == 'body' ? createDtos : dtos;

    if (dtosType[tableName]) {
      const dtoClass = dtosType[tableName] as ClassConstructor<any>;
      const dtoInstance = plainToInstance(dtoClass, req[value]);
      const errors: ValidationError[] = await validate(dtoInstance, { skipMissingProperties, whitelist, forbidNonWhitelisted });

      if (errors.length > 0) {
        const errorMessages = errors.map((error: ValidationError) => Object.values(error.constraints || {}).join(', ')).join(', ');

        if (errorMessages.includes("must be a Date instance")) {
          const dateField = errorMessages.split(' ')[0];
          if (req[value][dateField] === "Invalid Date") {
            return next(new HttpException(400, `${dateField} is an invalid date`));
          }
          req[value][dateField] = new Date(req[value][dateField]);

          const reErrors: ValidationError[] = await validate(plainToInstance(dtoClass, req[value]), { skipMissingProperties, whitelist, forbidNonWhitelisted });
          if (reErrors.length > 0) {
            const reErrorMessages = reErrors.map((error: ValidationError) => Object.values(error.constraints || {}).join(', ')).join(', ');
            return next(new HttpException(400, reErrorMessages));
          }
        } else {
          return next(new HttpException(400, errorMessages));
        }
      }
      next();
    } else {
      next(new HttpException(401, `No DTO found for model ${tableName}`));
    }
  };
};

export default validationMiddleware;
