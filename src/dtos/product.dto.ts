import { IsString, IsNumber } from 'class-validator'
import { BaseDto } from './base.dto'

export class ProductsDto extends BaseDto {
  @IsString()
  public productName: string

  @IsNumber()
  public price: number
}