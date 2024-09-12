import { IsString, IsNumber, IsDate } from 'class-validator';

export class CreateUsersDto {
  @IsString()
  public username: string;

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