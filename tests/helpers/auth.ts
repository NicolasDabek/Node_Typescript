import BaseRoute from '../../src/routes/base.route';
import { generateFakeData } from '../../generators/generateTests';
import { signAuthToken } from '../../src/utils/jwt.util';

/**
 * Tests d'intégration : crée un utilisateur réel (modèle BaseRoute.userModel) et renvoie
 * l'en-tête "Bearer <jwt>" accepté par authMiddleware. Le CRUD générique exige un JWT par défaut.
 */
export async function authHeader(): Promise<string> {
  const model = BaseRoute.userModel;
  const pk = model.primaryKeyAttribute;
  const { [pk]: _pk, ...data } = generateFakeData(model.getAttributes());
  data[BaseRoute.fieldNameUsername] = `it_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  const user = await model.create(data as any);
  return `Bearer ${signAuthToken({ id: user.get(pk) as number, username: data[BaseRoute.fieldNameUsername] }).token}`;
}
