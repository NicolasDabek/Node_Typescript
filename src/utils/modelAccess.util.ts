import HttpException from '../exceptions/HttpException';

const blocked = (process.env.CRUD_BLOCKED_MODELS || 'users')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const allowed = process.env.CRUD_ALLOWED_MODELS
  ? process.env.CRUD_ALLOWED_MODELS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  : null;

export function normalizeModelName(modelName?: string): string {
  return (modelName || '').trim().toLowerCase();
}

export function isModelExposed(modelName: string): boolean {
  const name = normalizeModelName(modelName);
  if (!name) return false;
  if (blocked.includes(name)) return false;
  if (allowed && !allowed.includes(name)) return false;
  return true;
}

export function assertModelAccessible(modelName: string): string {
  const name = normalizeModelName(modelName);
  if (!name) throw new HttpException(400, 'Model name is required.');
  if (!isModelExposed(name)) throw new HttpException(403, `Model '${name}' is not exposed via generic CRUD.`);
  return name;
}

export function extractModelFromPath(pathName: string): string {
  return normalizeModelName(pathName.split('/').filter(Boolean)[0]);
}
