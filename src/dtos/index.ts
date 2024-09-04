import { UsersDto } from './user.dto';
import { CreateUsersDto } from './createDtos/user.dto';

import { ProductsDto } from './product.dto';
import { CreateProductsDto } from './createDtos/product.dto';

export const dtos = {
  users: UsersDto,
  products: ProductsDto
};

export const createDtos = {
  users: CreateUsersDto,
  products: CreateProductsDto
};

export type DtoKeys = keyof typeof dtos;
export type DtoValues = typeof dtos[DtoKeys];

export type CreateDtoKeys = keyof typeof createDtos;
export type CreateDtoValues = typeof createDtos[CreateDtoKeys];