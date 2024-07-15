import { IsString, IsEmail } from 'class-validator'
import { BaseDto } from './base.dto'

export class UsersDto extends BaseDto {
  @IsEmail()
  public email: string

  @IsString()
  public password: string
}