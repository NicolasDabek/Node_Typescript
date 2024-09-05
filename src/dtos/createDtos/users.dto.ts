
import { IsString, IsEmail, IsNumber, IsDate, IsBoolean } from 'class-validator'

export class CreateUsersDto {
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
