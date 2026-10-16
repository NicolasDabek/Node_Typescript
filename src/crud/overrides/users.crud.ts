import { CrudModelOptions } from '../crud.interface';
import { hashPassword } from '../../utils/password.util';

const hashIfPresent = async (data: Record<string, unknown>) =>
  data.password ? { ...data, password: await hashPassword(String(data.password)) } : data;

/** users : bloqué par défaut (CRUD_BLOCKED_MODELS), mot de passe hashé et jamais renvoyé si on l'expose. */
const usersCrud: CrudModelOptions = {
  hiddenFields: ['password'],
  hooks: {
    beforeCreate: hashIfPresent,
    beforeUpdate: hashIfPresent,
  },
};

export default usersCrud;
