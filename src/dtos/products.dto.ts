import { BaseDto } from './base.dto';
import { IsString, IsNumber } from 'class-validator';

export class ProductsDto extends BaseDto {
  @IsString()
  public productName: string;

  @IsNumber()
  public price: number;
}