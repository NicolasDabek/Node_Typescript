import bcrypt from 'bcrypt'
import DB from '@databases'
import HttpException from '@exceptions/HttpException'
import { isEmpty } from '@/utils/others.util'
import { Model } from 'sequelize/types/model'
import { BaseDto } from '@/dtos/base.dto'
import BaseRoute from '@/routes/base.route'

class BaseService {
  private models = DB.Models

  public async findAllData(tableName: string): Promise<Model[]> {
    if (isEmpty(tableName)) throw new HttpException(400, "You're not tableName")
    let allData: Model[] = await this.models[tableName].findAll()
    return allData
  }

  public async findDataById(tableName: string, dataId: number): Promise<Model> {
    if (isEmpty(dataId)) throw new HttpException(400, "You're not dataId")

    const findData: Model = await this.models[tableName].findByPk(dataId)
    if (!findData) throw new HttpException(409, "You're not data")

    return findData
  }

  public async findAllDataOneField(tableName: string, attrName: string): Promise<Model[]> {
    let allData: any[]
    const options: any = { where: { deleted: 0 }, attributes: ["id", attrName] }

    allData = await this.models[tableName].findAll(options)
    return allData
  }

  public async findManyByAttrName(tableName: string, attrName: string, attrVal: number): Promise<Model[]> {
    if (isEmpty(attrName) || isEmpty(attrVal)) throw new HttpException(400, "empty data not allowed")
    const options: Object = { where: { [attrName]: attrVal } }

    const rows: any[] = await this.models[tableName].findAll(options)
    if (!rows) throw new HttpException(409, "no row found")

    return rows
  }

  public async createData(tableName: string, datas: BaseDto): Promise<Model> {
    if (isEmpty(datas)) throw new HttpException(400, "You're not data")

    //const findData: Model = await this.models[tableName].findOne({ where: { id: datas.id } })
    //if (findData) throw new HttpException(409, `You're email ${datas.id} already exists`)

    if(BaseRoute.usersTableName.includes(tableName) && datas["password"]) {
      datas["password"] = await bcrypt.hash(datas["password"], 6)
    }
    const createdata: Model = await this.models[tableName].create(datas)
    return createdata
  }

  public async updateData(tableName: string, dataId: number, datas: BaseDto): Promise<Model> {
    if (isEmpty(datas)) throw new HttpException(400, "You're not datas")

    const findData: Model = await this.models[tableName].findByPk(dataId)
    if (!findData) throw new HttpException(409, "You're not data")

    if(BaseRoute.usersTableName.includes(tableName) && datas["password"]) {
      datas["password"] = await bcrypt.hash(datas["password"], 10)
    }
    await this.models[tableName].update(datas, { where: { id: dataId } })

    const updateData: Model = await this.models[tableName].findByPk(dataId)
    return updateData
  }

  public async deleteData(tableName: string, dataId: number): Promise<Model> {
    if (isEmpty(dataId)) throw new HttpException(400, "You're not dataId")

    const findData: Model = await this.models[tableName].findByPk(dataId)
    if (!findData) throw new HttpException(409, "You're not data")

    await this.models[tableName].destroy({ where: { id: dataId } })

    return findData
  }
}

export default BaseService
