// Compatibilité : la logique d'exposition vit désormais dans src/crud/registry.ts.
import { assertCrudAccess, isModelExposed, normalizeModelName } from '../crud/registry';

export { isModelExposed, normalizeModelName };

export function assertModelAccessible(modelName: string): string {
  return assertCrudAccess(modelName).name;
}

export function extractModelFromPath(pathName: string): string {
  return normalizeModelName(pathName.split('/').filter(Boolean)[0]);
}
