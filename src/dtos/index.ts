import { UsersDto } from './user.dto';
import { CreateUsersDto } from './createDtos/users.dto';

export const dtos = {
  users: UsersDto
};

export const createDtos = {
  users: CreateUsersDto
};

export type DtoKeys = keyof typeof dtos;
export type DtoValues = typeof dtos[DtoKeys];

export type CreateDtoKeys = keyof typeof createDtos;
export type CreateDtoValues = typeof createDtos[CreateDtoKeys];