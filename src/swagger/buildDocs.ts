import { getMetadataStorage } from 'class-validator';
import Route from '../interfaces/routes.interface';
import DB from '../databases';
import { createDtos, CreateDtoKeys } from '../dtos';
import { listCrudModels } from '../crud/registry';
import { CrudOperation, ResolvedCrudModel } from '../crud/crud.interface';
import { modelToSchemas } from './modelToSchema';
import { SchemaObject } from './schemaObject.interface';
import { SwaggerDoc } from './swaggerDoc.interface';

type Operation = Record<string, unknown>;

const ref = (name: string): SchemaObject => ({ $ref: `#/components/schemas/${name}` });
const wrap = (schema: SchemaObject): SchemaObject => ({ type: 'object', properties: { datas: schema } });
const json = (schema: SchemaObject) => ({ content: { 'application/json': { schema } } });
const errorRef = (name: string) => ({ $ref: `#/components/responses/${name}` });

const ERROR_RESPONSES: Record<string, { status: string; description: string }> = {
  BadRequest: { status: '400', description: 'Requête invalide (validation, paramètre manquant)' },
  Unauthorized: { status: '401', description: 'JWT manquant, invalide ou expiré' },
  Forbidden: { status: '403', description: 'Modèle non exposé ou opération interdite' },
  NotFound: { status: '404', description: 'Ressource introuvable' },
  InternalError: { status: '500', description: 'Erreur interne' },
};

/** Champs requis du DTO de création (ce que la validation exige réellement). */
function requiredFromCreateDto(modelName: string): string[] | undefined {
  const dto = createDtos[modelName as CreateDtoKeys];
  if (!dto) return undefined;
  const metas = getMetadataStorage().getTargetValidationMetadatas(dto, '', false, false);
  const props = new Set(metas.map(m => m.propertyName));
  const optional = new Set(metas.filter(m => m.type === 'conditionalValidation').map(m => m.propertyName));
  return [...props].filter(p => !optional.has(p));
}

function addModelSchemas(doc: SwaggerDoc, config: ResolvedCrudModel) {
  const model = DB.Models[config.name as keyof typeof DB.Models];
  if (!model) return;
  const schemas = modelToSchemas(model as any, config.hiddenFields);
  const required = requiredFromCreateDto(config.name);
  if (required) schemas.create.required = required.length ? required : undefined;
  doc.components.schemas[config.name] = schemas.read;
  doc.components.schemas[`${config.name}Create`] = schemas.create;
  doc.components.schemas[`${config.name}Update`] = schemas.update;
}

/** ":id(\\d+)" -> "{id}" et paramètres de chemin correspondants. */
function toOpenApiPath(rawPath: string): { path: string; parameters: Operation[] } {
  const parameters: Operation[] = [];
  const path = rawPath.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?/g, (_m, name: string, pattern?: string) => {
    const isInt = !!pattern && pattern.includes('\\d');
    parameters.push({ name, in: 'path', required: true, schema: { type: isInt ? 'integer' : 'string' } });
    return `{${name}}`;
  });
  return { path, parameters };
}

/** Décrit une route du CRUD générique d'après son chemin et sa méthode. */
function crudOperation(rawPath: string, method: string, model: string): { op: CrudOperation; summary: string; body?: SchemaObject; response: SchemaObject; status: string } | null {
  const sub = rawPath.replace('/:model', '');
  const one = ref(model);
  const many: SchemaObject = { type: 'array', items: one };
  if (method === 'get' && sub === '') return { op: 'list', summary: `Liste des ${model}`, response: many, status: '200' };
  if (method === 'get' && sub.startsWith('/:id')) return { op: 'read', summary: `Un ${model} par id`, response: one, status: '200' };
  if (method === 'get' && sub.startsWith('/onefield')) return { op: 'field', summary: `Un seul champ de tous les ${model}`, response: many, status: '200' };
  if (method === 'get' && sub.startsWith('/multiple')) return { op: 'search', summary: `${model} filtrés par valeur de champ`, response: many, status: '200' };
  if (method === 'post' && sub === '') return { op: 'create', summary: `Créer un ${model}`, body: ref(`${model}Create`), response: one, status: '201' };
  if (method === 'put') return { op: 'update', summary: `Modifier un ${model}`, body: ref(`${model}Update`), response: one, status: '200' };
  if (method === 'delete') return { op: 'delete', summary: `Supprimer un ${model}`, response: one, status: '200' };
  return null;
}

function setOperation(doc: SwaggerDoc, path: string, method: string, operation: Operation) {
  doc.paths[path] = doc.paths[path] || {};
  doc.paths[path][method] = operation;
}

function routeEntries(route: Route): { path: string; method: string }[] {
  const stack: any[] = (route.router as any).stack || [];
  return stack
    .filter(layer => layer.route)
    .flatMap(layer => Object.keys(layer.route.methods).map(method => ({ path: layer.route.path as string, method })));
}

/**
 * Construit la doc OpenAPI à partir des routes réellement enregistrées :
 * - routes du CRUD générique (/:model) déclinées pour chaque modèle exposé (les modèles bloqués sont exclus),
 * - routes spécifiques (*.route.ts) avec leurs paramètres.
 * Schémas dérivés des modèles Sequelize ; champs requis en création pris des DTOs.
 */
export function buildSwaggerDoc(routes: Route[]): SwaggerDoc {
  const models = listCrudModels();
  const exposed = models.filter(m => m.exposed);
  const blocked = models.filter(m => !m.exposed).map(m => m.name);

  const doc: SwaggerDoc = {
    openapi: '3.0.3',
    info: {
      title: process.env.API_TITLE || 'API Documentation',
      version: process.env.API_VERSION || '1.0.0',
      description: blocked.length ? `Modèles non exposés par le CRUD générique : ${blocked.join(', ')}.` : undefined,
    },
    tags: models.map(m => ({ name: m.name, description: m.exposed ? undefined : 'Non exposé par le CRUD générique (routes spécifiques uniquement)' })),
    paths: {},
    components: {
      schemas: {
        Error: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] },
        Login: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string', format: 'password' } }, required: ['username', 'password'] },
        Token: { type: 'object', properties: { token: { type: 'string' }, expiresIn: { type: 'integer' } } },
      },
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      responses: Object.fromEntries(Object.entries(ERROR_RESPONSES).map(([name, { description }]) => [name, { description, ...json(ref('Error')) }])),
    },
  };
  models.forEach(m => addModelSchemas(doc, m));

  for (const route of routes) {
    for (const { path: rawPath, method } of routeEntries(route)) {
      if (rawPath.includes('/:model')) {
        for (const model of exposed) {
          const described = crudOperation(rawPath, method, model.name);
          if (!described || !model.operations.includes(described.op)) continue;
          const { path, parameters } = toOpenApiPath(rawPath.replace(':model', model.name));
          const responses: Record<string, unknown> = {
            [described.status]: { description: 'OK', ...json(wrap(described.response)) },
            400: errorRef('BadRequest'),
            500: errorRef('InternalError'),
          };
          if (parameters.some(p => p.name === 'id')) responses[404] = errorRef('NotFound');
          if (model.auth) responses[401] = errorRef('Unauthorized');
          setOperation(doc, path, method, {
            tags: [model.name],
            summary: described.summary,
            operationId: `${described.op}_${model.name}`,
            parameters: parameters.length ? parameters : undefined,
            requestBody: described.body ? { required: true, ...json(described.body) } : undefined,
            responses,
            security: model.auth ? [{ bearerAuth: [] }] : undefined,
          });
        }
      } else {
        const { path, parameters } = toOpenApiPath(rawPath);
        const tag = rawPath.split('/').filter(Boolean)[0] || 'default';
        const isLogin = /\/login$/.test(rawPath);
        const isRegister = /\/register$/.test(rawPath);
        const body = isLogin ? ref('Login') : method === 'post' && doc.components.schemas[`${tag}Create`] ? ref(`${tag}Create`) : undefined;
        const okSchema = isLogin ? wrap(ref('Token')) : doc.components.schemas[tag] ? wrap(ref(tag)) : { type: 'object' };
        setOperation(doc, path, method, {
          tags: [tag],
          summary: `${method.toUpperCase()} ${path}`,
          parameters: parameters.length ? parameters : undefined,
          requestBody: body ? { required: true, ...json(body) } : undefined,
          responses: {
            [isRegister ? '201' : '200']: { description: 'OK', ...json(okSchema) },
            400: errorRef('BadRequest'),
            ...(isLogin ? { 401: errorRef('Unauthorized') } : {}),
            500: errorRef('InternalError'),
          },
        });
      }
    }
  }

  return JSON.parse(JSON.stringify(doc)); // retire les clés undefined
}
