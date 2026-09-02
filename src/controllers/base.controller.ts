import { Request, Response, NextFunction } from 'express';
import BaseService from '../services/base.service';
import HttpException from '../exceptions/HttpException';
import { Model } from 'sequelize';

class BaseController {
  static baseService = new BaseService();

  static async getAllDatas(req: Request, res: Response, next: NextFunction) {
    try {
      const findAllDatas: Model[] = await BaseController.baseService.findAllDatas(req.params.model);
      res.status(200).json({ datas: findAllDatas });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async getDataById(req: Request, res: Response, next: NextFunction) {
    try {
      const findOneData: Model = await BaseController.baseService.findDataById(req.params.model, Number(req.params.id));
      res.status(200).json({ datas: findOneData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async getAllDataOneField(req: Request, res: Response, next: NextFunction) {
    try {
      const findAllDatas: Model[] = await BaseController.baseService.findAllDatasOneField(req.params.model, req.params.fieldName);
      res.status(200).json({ datas: findAllDatas });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async getMultipleByFieldVal(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = req.params.fieldVal;
      const fieldVal = raw !== undefined && raw !== '' && !isNaN(Number(raw)) && String(Number(raw)) === raw ? Number(raw) : raw;
      const findMultipleDatas: Model[] = await BaseController.baseService.findMultipleByFieldName(req.params.model, req.params.fieldName, fieldVal);
      res.status(200).json({ datas: findMultipleDatas });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async getLastData(req: Request, res: Response, next: NextFunction) {
    try {
      const findLastData: Model = await BaseController.baseService.findLastData(req.params.model);
      res.status(200).json({ datas: findLastData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async createData(req: Request, res: Response, next: NextFunction) {
    try {
      const createdData = await BaseController.baseService.createData(req.params.model, req.body);
      res.status(201).json({ datas: createdData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async updateData(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedData = await BaseController.baseService.updateData(req.params.model, Number(req.params.id), req.body);
      res.status(200).json({ datas: updatedData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }

  static async deleteData(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedData = await BaseController.baseService.deleteData(req.params.model, Number(req.params.id));
      res.status(200).json({ datas: deletedData });
    } catch (error) {
      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));
    }
  }
}

export default BaseController;
