import { IsString, IsEmail, IsNumber, IsDate } from 'class-validator'
import { BaseDto } from './base.dto'

export class UsersDto extends BaseDto {
  @IsString()
  public pseudo: string

  @IsEmail()
  public email: string

  @IsString()
  public password: string

  @IsNumber()
  public isActive: number

  @IsString()
  public addressIP: string

  @IsDate()
  public dateCreation: Date
}