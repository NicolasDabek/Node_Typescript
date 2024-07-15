import { Router } from 'express'
import BaseControler from '@controllers/base.controller'
import CreateDtos from '@dtos/createDtos/index'
import Route from '@interfaces/routes.interface'
import validationMiddleware from '@middlewares/validation.middleware'
import DB from '../databases'
import authMiddleware from '@middlewares/auth.middleware'

class BaseRoute implements Route {
  public path = '/'
  public router = Router()
  public static usersTableName = ["users"]
  public static relTables = []

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    for (const tableName of Object.keys(DB.Models)) {
      this.baseCRUD(tableName, CreateDtos[tableName] || null)
    }
  }

  private baseCRUD(currentTableName: string, createDto: any) {
    this.router.get(`${this.path}${currentTableName}/:id(\\d+)`,
      (req, res, next) => BaseControler.getDataById(req, res, next, currentTableName))
    this.router.get(`${this.path}${currentTableName}s`,
      (req, res, next) => BaseControler.getAllDatas(req, res, next, currentTableName))
    this.router.get(`${this.path}${currentTableName}sonefield/:attrName`,
      (req, res, next) => BaseControler.getAllDataOneField(req, res, next, currentTableName))
    this.router.get(`${this.path}${currentTableName}s/:attrName/:attrVal`,
      (req, res, next) => BaseControler.getManyByAttrVal(req, res, next, currentTableName))
    if (createDto) {
      this.router.post(`${this.path}${currentTableName}`, validationMiddleware(createDto, 'body'),
        (req, res, next) => BaseControler.createData(req, res, next, currentTableName))
      this.router.put(`${this.path}${currentTableName}/:id(\\d+)`, validationMiddleware(createDto, 'body', true),
        (req, res, next) => BaseControler.updateData(req, res, next, currentTableName))
    }
    this.router.delete(`${this.path}${currentTableName}/:id(\\d+)`,
      (req, res, next) => BaseControler.deleteData(req, res, next, currentTableName))
  }
}

export default BaseRoute