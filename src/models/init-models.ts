import type { Sequelize } from "sequelize";
import { products as _products } from "./products";
import type { productsAttributes, productsCreationAttributes } from "./products";
import { users as _users } from "./users";
import type { usersAttributes, usersCreationAttributes } from "./users";

export {
  _products as products,
  _users as users,
};

export type {
  productsAttributes,
  productsCreationAttributes,
  usersAttributes,
  usersCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
  const products = _products.initModel(sequelize);
  const users = _users.initModel(sequelize);


  return {
    products: products,
    users: users,
  };
}
