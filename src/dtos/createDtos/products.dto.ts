import { IsString, IsNumber } from 'class-validator';

export class CreateProductsDto {
  @IsString()
  public productName: string;

  @IsNumber()
  public price: number;
}