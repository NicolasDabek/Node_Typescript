import { Request, Response, NextFunction } from "express";
import BaseService from "../services/base.service";
import { BaseDto } from "../dtos/base.dto";
import HttpException from "../exceptions/HttpException";
import { Model } from "sequelize";

class BaseController {
  static baseService = new BaseService();

  static async getAllDatas(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString();
      const findAllDatas: Model[] = await BaseController.baseService.findAllDatas(tableName);
      res.status(200).json({ datas: findAllDatas });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async getDataById(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString();
      const dataId = Number(req.params.id);
      const findOneData: Model = await BaseController.baseService.findDataById(tableName, dataId);
      res.status(200).json({ datas: findOneData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async getAllDataOneField(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString();
      const fieldName = req.params.fieldName.toString();
      const findAllDatas: Model[] = await BaseController.baseService.findAllDatasOneField(tableName, fieldName);
      res.status(200).json({ datas: findAllDatas });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async getMultipleByFieldVal(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString();
      const fieldName = req.params.fieldName.toString();
      const fieldVal = Number(req.params.fieldVal);
      const findMultipleDatas: Model[] = await BaseController.baseService.findMultipleByFieldName(tableName, fieldName, fieldVal);
      res.status(200).json({ datas: findMultipleDatas });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async getLastData(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString();
      const findLastData: Model = await BaseController.baseService.findLastData(tableName);
      res.status(200).json({ datas: findLastData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async createData(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString();
      const datas: Model = req.body;
      await BaseController.baseService.createData(tableName, datas);
      const createdData = await (await BaseController.baseService.findLastData(tableName)).dataValues
      res.status(201).json({ datas: createdData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async updateData(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString();
      const dataId = Number(req.params.id);
      const datas: BaseDto = req.body;
      await BaseController.baseService.updateData(tableName, dataId, datas);
      const updatedData = await (await BaseController.baseService.findLastData(tableName)).dataValues
      res.status(200).json({ datas: updatedData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async deleteData(req: Request, res: Response, next: NextFunction) {
    try {
      const tableName = req.params.model.toString();
      const dataId = Number(req.params.id);
      const deletedData = await BaseController.baseService.deleteData(tableName, dataId);
      res.status(200).json({ datas: deletedData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }
}

export default BaseController;