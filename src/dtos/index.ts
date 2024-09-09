import { ProductsDto } from './products.dto';
import { UsersDto } from './users.dto';

import { CreateProductsDto } from './createDtos/products.dto';
import { CreateUsersDto } from './createDtos/users.dto';

export const dtos = {
  products: ProductsDto,
  users: UsersDto
};

export const createDtos = {
  products: CreateProductsDto,
  users: CreateUsersDto
};

export type DtoKeys = keyof typeof dtos;
export type DtoValues = typeof dtos[DtoKeys];

export type CreateDtoKeys = keyof typeof createDtos;
export type CreateDtoValues = typeof createDtos[CreateDtoKeys];