export type CrudOperation = 'list' | 'read' | 'field' | 'search' | 'create' | 'update' | 'delete';

export const ALL_CRUD_OPERATIONS: CrudOperation[] = ['list', 'read', 'field', 'search', 'create', 'update', 'delete'];

export type CrudData = Record<string, unknown>;

/** Hooks appelés par le CRUD générique ; ils renvoient les données (éventuellement transformées). */
export interface CrudHooks {
  beforeCreate?: (data: CrudData) => CrudData | Promise<CrudData>;
  beforeUpdate?: (data: CrudData, id: number) => CrudData | Promise<CrudData>;
  /** Transforme chaque enregistrement avant envoi (ex. retirer un champ sensible). */
  serialize?: (record: CrudData) => CrudData;
}

/**
 * Surcharge déclarative d'un modèle pour le CRUD générique.
 * À placer dans src/crud/overrides/<modele>.crud.ts (export default), chargé automatiquement.
 */
export interface CrudModelOptions {
  /** Force l'exposition (true) ou le blocage (false) ; sinon CRUD_BLOCKED_MODELS / CRUD_ALLOWED_MODELS. */
  exposed?: boolean;
  /** Exige un JWT ; sinon GENERIC_CRUD_AUTH. */
  auth?: boolean;
  /** Opérations autorisées (toutes par défaut). */
  operations?: CrudOperation[];
  /** Champs jamais renvoyés ni filtrables via le CRUD générique. */
  hiddenFields?: string[];
  hooks?: CrudHooks;
}

export interface ResolvedCrudModel {
  name: string;
  exposed: boolean;
  auth: boolean;
  operations: CrudOperation[];
  hiddenFields: string[];
  hooks: CrudHooks;
}
