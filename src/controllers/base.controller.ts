import { Request, Response } from 'express';
import BaseService from '../services/base.service';
import { asyncHandler } from '../utils/asyncHandler.util';

/** Convertit une valeur de chemin en nombre si elle en est un exactement ("12" -> 12, "012" reste une chaîne). */
const parseFieldValue = (raw: string): string | number =>
  raw !== '' && !isNaN(Number(raw)) && String(Number(raw)) === raw ? Number(raw) : raw;

const ok = (res: Response, datas: unknown, status = 200) => res.status(status).json({ datas });

/** Handlers du CRUD générique (/:model). Les erreurs sont transmises au middleware d'erreur. */
class BaseController {
  static baseService = new BaseService();

  static getAllDatas = asyncHandler(async (req: Request, res: Response) =>
    ok(res, await BaseController.baseService.findAllDatas(req.params.model)));

  static getDataById = asyncHandler(async (req: Request, res: Response) =>
    ok(res, await BaseController.baseService.findDataById(req.params.model, Number(req.params.id))));

  static getAllDataOneField = asyncHandler(async (req: Request, res: Response) =>
    ok(res, await BaseController.baseService.findAllDatasOneField(req.params.model, req.params.fieldName)));

  static getMultipleByFieldVal = asyncHandler(async (req: Request, res: Response) =>
    ok(res, await BaseController.baseService.findMultipleByFieldName(req.params.model, req.params.fieldName, parseFieldValue(req.params.fieldVal))));

  static getLastData = asyncHandler(async (req: Request, res: Response) =>
    ok(res, await BaseController.baseService.findLastData(req.params.model)));

  static createData = asyncHandler(async (req: Request, res: Response) =>
    ok(res, await BaseController.baseService.createData(req.params.model, req.body), 201));

  static updateData = asyncHandler(async (req: Request, res: Response) =>
    ok(res, await BaseController.baseService.updateData(req.params.model, Number(req.params.id), req.body)));

  static deleteData = asyncHandler(async (req: Request, res: Response) =>
    ok(res, await BaseController.baseService.deleteData(req.params.model, Number(req.params.id))));
}

export default BaseController;
