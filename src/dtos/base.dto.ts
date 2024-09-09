import { IsNumber } from 'class-validator';

export class BaseDto {
  @IsNumber()
  public id: number;
}