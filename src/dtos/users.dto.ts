import { BaseDto } from './base.dto';
import { IsString, IsNumber, IsDate } from 'class-validator';

export class UsersDto extends BaseDto {
  @IsString()
  public pseudo: string;

  @IsString()
  public password: string;

  @IsString()
  public email: string;

  @IsNumber()
  public isActive: number;

  @IsString()
  public addressIP: string;

  @IsDate()
  public dateCreation: Date;
}