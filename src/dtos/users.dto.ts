
import { IsString, IsEmail, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { BaseDto } from './base.dto';

export class UsersDto extends BaseDto {
  @IsString()
  public pseudo: string;

  @IsString()
  public password: string;

  @IsString()
  public email: string;

  @IsBoolean()
  public isActive: boolean;

  @IsString()
  public addressIP: string;

  @IsDate()
  public dateCreation: Date;


}
