
import { IsString, IsEmail, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { BaseDto } from './base.dto';

export class ProductsDto extends BaseDto {
  @IsString()
  public productName: string;

  @IsNumber()
  public price: number;
}
