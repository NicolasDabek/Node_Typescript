import { plainToInstance } from 'class-transformer'
import { validate, ValidationError } from 'class-validator'
import { RequestHandler } from 'express'
import HttpException from '../exceptions/HttpException'
import CreateDtos from '../dtos/createDtos/index'

const validationMiddleware = (
  value: string | 'body' | 'query' | 'params' = 'body',
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true,
): RequestHandler => {
  return (req, res, next) => {
    const tableName = req.params.model.toString()
    if (CreateDtos[tableName]) {
      validate(plainToInstance(CreateDtos[tableName], req[value]), { skipMissingProperties, whitelist, forbidNonWhitelisted })
        .then((errors: ValidationError[]) => {
          if (errors.length > 0) {
            const message = errors.map((error: ValidationError) => Object.values(error.constraints)).join(', ')
            if (message.includes("must be a Date instance")) {
              if (req[value][message.split(" ")[0]] == "Invalid Date") {
                next(new HttpException(400, message))
              }
              req[value][message.split(" ")[0]] = new Date(req[value][message.split(" ")[0]])
              validationMiddleware(value, skipMissingProperties, whitelist, forbidNonWhitelisted)
              next()
              return
            }
            next(new HttpException(400, message))
          } else {
            next()
          }
        })
    }
    else { next(new HttpException(401, 'There is no DTO for this model')) }
  }
}

export default validationMiddleware