import { Request, Response, NextFunction } from "express"
import BaseService from "@/services/base.service"
import Model from "sequelize/types/model"
import { BaseDto } from "@/dtos/base.dto"

class BaseController {
  static baseService = new BaseService()

  static async getAllDatas(req: Request, res: Response, next: NextFunction, tableName: string) {
    try {
      const findAllData: Model[] = await BaseController.baseService.findAllData(tableName)

      res.status(200).json({ datas: findAllData, message: 'findAll' })
    } catch (error) {
      next(error)
    }
  }

  static async getDataById(req: Request, res: Response, next: NextFunction, tableName: string) {
    try {
      const dataId = Number(req.params.id)
      const findOneData: Model = await BaseController.baseService.findDataById(tableName, dataId)

      res.status(200).json({ data: findOneData, message: 'findOne' })
    }
    catch (error) { next(error) }
  }

  static async getAllDataOneField(req: Request, res: Response, next: NextFunction, tableName: string) {
    try {
      const attrName = req.params.attrName.toString()
      const findAllData: Model[] = await BaseController.baseService.findAllDataOneField(tableName, attrName)

      res.status(200).json({ datas: findAllData, message: 'findAll' })
    }
    catch (error) { next(error) }
  }

  static async getManyByAttrVal(req: Request, res: Response, next: NextFunction, tableName: string) {
    try {
      const attributName: string = req.params.attrName
      const attributVal: number = Number(req.params.attrVal)
      const findManyData: Model[] = await BaseController.baseService.findManyByAttrName(tableName, attributName, attributVal)

      res.status(200).json({ datas: findManyData, message: 'findMany' })
    }
    catch (error) { next(error) }
  }

  static async createData(req: Request, res: Response, next: NextFunction, tableName: string) {
    try {
      const datas: BaseDto = req.body
      const createdData: Model = await BaseController.baseService.createData(tableName, datas)

      res.status(201).json({ data: createdData, message: 'created' })
    } catch (error) {
      next(error)
    }
  }

  static async updateData(req: Request, res: Response, next: NextFunction, tableName: string) {
    try {
      const dataId = Number(req.params.id)
      const datas: BaseDto = req.body
      const updatedData: Model = await BaseController.baseService.updateData(tableName, dataId, datas)

      res.status(200).json({ data: updatedData, message: 'updated' })
    } catch (error) {
      next(error)
    }
  }

  static async deleteData(req: Request, res: Response, next: NextFunction, tableName: string) {
    try {
      const dataId = Number(req.params.id)
      const deletedData: Model = await BaseController.baseService.deleteData(tableName, dataId)

      res.status(200).json({ data: deletedData, message: 'deleted' })
    } catch (error) {
      next(error)
    }
  }
}

export default BaseController