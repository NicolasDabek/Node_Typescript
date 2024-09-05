
import { IsString, IsEmail, IsNumber, IsDate, IsBoolean } from 'class-validator'

export class CreateProductsDto {
  @IsString()
  public productName: string;

  @IsNumber()
  public price: number;
}
