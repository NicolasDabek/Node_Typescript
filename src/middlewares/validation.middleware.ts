import { plainToInstance } from 'class-transformer'
import { validate, ValidationError } from 'class-validator'
import { RequestHandler } from 'express'
import HttpException from '@exceptions/HttpException'

const validationMiddleware = (
  type: any,
  value: string | 'body' | 'query' | 'params' = 'body',
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true,
): RequestHandler => {
  return (req, res, next) => {
    validate(plainToInstance(type, req[value]), { skipMissingProperties, whitelist, forbidNonWhitelisted }).then((errors: ValidationError[]) => {
      if (errors.length > 0) {
        const message = errors.map((error: ValidationError) => Object.values(error.constraints)).join(', ')
        if(message.includes("must be a Date instance")) {
          req[value][message.split(" ")[0]] = new Date(req[value][message.split(" ")[0]])
          if(req[value][message.split(" ")[0]] == "Invalid Date") {
            next(new HttpException(400, message))
          }
          validationMiddleware(type, value, skipMissingProperties, whitelist, forbidNonWhitelisted)
          next()
          return
        }
        next(new HttpException(400, message))
      } else {
        next()
      }
    })
  }
}

export default validationMiddleware