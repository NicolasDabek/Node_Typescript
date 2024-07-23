import { Request, Response, NextFunction } from "express"
import BaseService from "@/services/base.service"
import Model from "sequelize/types/model"
import { BaseDto } from "@/dtos/base.dto"

class BaseController {
  static baseService = new BaseService()

  static async getAllDatas(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString()
      const findAllDatas: Model[] = await BaseController.baseService.findAllDatas(tableName)

      res.status(200).json({ datas: findAllDatas, message: 'findAll' })
    } catch (error) {
      next(error)
    }
  }

  static async getDataById(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString()
      const dataId = Number(req.params.id)
      const findOneData: Model = await BaseController.baseService.findDataById(tableName, dataId)

      res.status(200).json({ data: findOneData, message: 'findOne' })
    }
    catch (error) { next(error) }
  }

  /**
   * Récupère un seul champ sur toutes les entrées.
   */
  static async getAllDataOneField(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString()
      const fieldName = req.params.fieldName.toString()
      const findAllDatas: Model[] = await BaseController.baseService.findAllDatasOneField(tableName, fieldName)

      res.status(200).json({ datas: findAllDatas, message: 'findAll' })
    }
    catch (error) { next(error) }
  }

  /**
   * Récupère plusieurs entrées par la valeur d'un champ.
   */
  static async getMultipleByFieldVal(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString()
      const fieldName: string = req.params.fieldName
      const fieldVal: number = Number(req.params.fieldVal)
      const findMultipleDatas: Model[] = await BaseController.baseService.findMultipleByFieldName(tableName, fieldName, fieldVal)

      res.status(200).json({ datas: findMultipleDatas, message: 'findMultiple' })
    }
    catch (error) { next(error) }
  }

  static async createData(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString()
      const datas: BaseDto = req.body
      const createdData: Model = await BaseController.baseService.createData(tableName, datas)

      res.status(201).json({ data: createdData, message: 'created' })
    } catch (error) {
      next(error)
    }
  }

  static async updateData(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString()
      const dataId = Number(req.params.id)
      const datas: BaseDto = req.body
      const updatedData: Model = await BaseController.baseService.updateData(tableName, dataId, datas)

      res.status(200).json({ data: updatedData, message: 'updated' })
    } catch (error) {
      next(error)
    }
  }

  static async deleteData(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString()
      const dataId = Number(req.params.id)
      const deletedData: Model = await BaseController.baseService.deleteData(tableName, dataId)

      res.status(200).json({ data: deletedData, message: 'deleted' })
    } catch (error) {
      next(error)
    }
  }
}

export default BaseController