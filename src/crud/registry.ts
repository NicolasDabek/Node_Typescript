import fs from 'fs';
import path from 'path';
import DB from '../databases';
import HttpException from '../exceptions/HttpException';
import { ALL_CRUD_OPERATIONS, CrudModelOptions, CrudOperation, ResolvedCrudModel } from './crud.interface';

const csv = (value?: string): string[] =>
  (value || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

export const normalizeModelName = (modelName?: string): string => (modelName || '').trim().toLowerCase();

/** Modèles bloqués par variable d'environnement (users par défaut). */
export const getBlockedModels = (): string[] => csv(process.env.CRUD_BLOCKED_MODELS ?? 'users');
const getAllowedModels = (): string[] | null => (process.env.CRUD_ALLOWED_MODELS ? csv(process.env.CRUD_ALLOWED_MODELS) : null);

/** Charge les surcharges <modele>.crud.(ts|js) d'un dossier (src/crud/overrides par défaut). */
export function loadOverrides(dir = path.join(__dirname, 'overrides')): Record<string, CrudModelOptions> {
  const overrides: Record<string, CrudModelOptions> = {};
  if (!fs.existsSync(dir)) return overrides;
  for (const file of fs.readdirSync(dir)) {
    const match = /^(.+)\.crud\.(ts|js)$/.exec(file);
    if (!match || file.endsWith('.d.ts')) continue;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require(path.join(dir, file));
    overrides[normalizeModelName(match[1])] = imported.default || imported;
  }
  return overrides;
}

const overrides = loadOverrides();

/** Configuration effective d'un modèle (env + surcharge éventuelle). */
export function resolveCrudModel(modelName: string, source: Record<string, CrudModelOptions> = overrides): ResolvedCrudModel {
  const name = normalizeModelName(modelName);
  const override = source[name] || {};
  const allowed = getAllowedModels();
  const exposedByEnv = !getBlockedModels().includes(name) && (!allowed || allowed.includes(name));
  return {
    name,
    exposed: override.exposed ?? exposedByEnv,
    auth: override.auth ?? process.env.GENERIC_CRUD_AUTH === 'true',
    operations: override.operations ?? ALL_CRUD_OPERATIONS,
    hiddenFields: override.hiddenFields ?? [],
    hooks: override.hooks ?? {},
  };
}

/** Tous les modèles Sequelize connus, avec leur configuration CRUD. */
export function listCrudModels(): ResolvedCrudModel[] {
  return Object.keys(DB.Models).map(name => resolveCrudModel(name));
}

export function isModelExposed(modelName: string): boolean {
  const name = normalizeModelName(modelName);
  return !!name && resolveCrudModel(name).exposed;
}

/** 400 si vide, 403 si bloqué ou opération non autorisée. Renvoie la config résolue. */
export function assertCrudAccess(modelName: string, operation?: CrudOperation): ResolvedCrudModel {
  const name = normalizeModelName(modelName);
  if (!name) throw new HttpException(400, 'Model name is required.');
  const config = resolveCrudModel(name);
  if (!config.exposed) throw new HttpException(403, `Model '${name}' is not exposed via generic CRUD.`);
  if (operation && !config.operations.includes(operation)) {
    throw new HttpException(403, `Operation '${operation}' is not allowed on model '${name}'.`);
  }
  return config;
}
