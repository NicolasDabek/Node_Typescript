import fsSync from 'fs';
import os from 'os';
import path from 'path';
import { DataTypes } from 'sequelize';

// Les générateurs n'écrivent rien sur disque pendant les tests : writeFile/mkdir sont capturés.
const written: Record<string, string> = {};
jest.mock('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    writeFile: jest.fn(async (file: string, content: string) => { written[file] = content; }),
    mkdir: jest.fn(async () => undefined),
  };
});
jest.mock('child_process', () => ({ execFile: jest.fn() }));

import fs from 'fs/promises';
import { execFile } from 'child_process';
import { generateModelTests, generateFakeData, generateRelatedData } from '../../generators/generateTests';
import { generateDtos } from '../../generators/generateDtos';
import { generateInitModels } from '../../generators/generateInitModels';
import { generateModels, buildSequelizeAutoArgs } from '../../generators/generateModels';
import { generateResource } from '../../generators/generateResource';
import { generateSwaggerDocs, writeSwaggerDocs } from '../../generators/swagger/generateSwaggerDocs';
import { routes } from '../../src/routes';

const root = path.resolve(__dirname, '../..');
const committed = (rel: string) => fsSync.readFileSync(path.join(root, rel), 'utf-8');
const out = (rel: string) => written[path.join(root, rel)];

let log: jest.SpyInstance; let err: jest.SpyInstance;
beforeEach(() => {
  for (const k of Object.keys(written)) delete written[k];
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { log.mockRestore(); err.mockRestore(); jest.clearAllMocks(); });

describe('gen-tests', () => {
  it('reproduit exactement les tests commités de tests/models', async () => {
    await generateModelTests();
    expect(out('tests/models/products.test.ts')).toBe(committed('tests/models/products.test.ts'));
    expect(out('tests/models/users.test.ts')).toBe(committed('tests/models/users.test.ts'));
  });

  it('journalise un échec de création du dossier sans s’arrêter', async () => {
    (fs.mkdir as jest.Mock).mockRejectedValueOnce(new Error('EACCES'));
    await generateModelTests();
    expect(err).toHaveBeenCalledWith(expect.stringContaining('Erreur lors de la création du dossier'), expect.any(Error));
  });

  it('generateFakeData produit une valeur par type connu', () => {
    const data = generateFakeData({
      s: { type: new DataTypes.STRING() }, i: { type: new DataTypes.INTEGER() }, b: { type: new DataTypes.BOOLEAN() },
      d: { type: new DataTypes.DATE() }, f: { type: new DataTypes.FLOAT() }, dec: { type: new DataTypes.DECIMAL(10, 2) },
      j: { type: new DataTypes.JSON() },
    });
    expect(data).toMatchObject({ s: 'test-string', i: 1 });
    expect([0, 1]).toContain(data.b);
    expect(data.d).toBeInstanceOf(Date);
    expect(typeof data.f).toBe('number');
    expect(typeof data.dec).toBe('number');
    expect(data).not.toHaveProperty('j');
  });

  it('generateRelatedData crée les données liées (BelongsTo/HasOne/HasMany)', async () => {
    const target = {
      rawAttributes: { name: { type: new DataTypes.STRING() } }, primaryKeyAttribute: 'id',
      create: jest.fn(async () => ({ id: 10 })), bulkCreate: jest.fn(async () => [{ id: 11 }, { id: 12 }]),
    };
    const related = await generateRelatedData({
      associations: {
        owner: { associationType: 'BelongsTo', target, foreignKey: 'ownerId' },
        profile: { associationType: 'HasOne', target, foreignKey: 'profileId' },
        items: { associationType: 'HasMany', target, foreignKey: 'itemIds' },
        tags: { associationType: 'BelongsToMany', target, foreignKey: 'tagIds' },
      },
    });
    expect(related).toEqual({ ownerId: 10, profileId: 10, itemIds: [11, 12] });
    expect(target.create).toHaveBeenCalledWith({ name: 'test-string' });
  });
});

describe('gen-dtos', () => {
  it('reproduit les DTOs, le BaseDto et l’index commités', async () => {
    await generateDtos();
    for (const rel of ['src/dtos/products.dto.ts', 'src/dtos/users.dto.ts', 'src/dtos/createDtos/products.dto.ts',
      'src/dtos/createDtos/users.dto.ts', 'src/dtos/base.dto.ts', 'src/dtos/index.ts']) {
      expect([rel, out(rel)]).toEqual([rel, committed(rel)]);
    }
  });

  it('propage une configuration illisible', async () => {
    const readFile = jest.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('ENOENT'));
    await expect(generateDtos()).rejects.toThrow('ENOENT');
    expect(err).toHaveBeenCalled();
    readFile.mockRestore();
  });

  it('journalise sans planter les erreurs d’écriture du BaseDto, de l’index et des dossiers', async () => {
    (fs.mkdir as jest.Mock).mockRejectedValue(new Error('EACCES'));
    (fs.writeFile as jest.Mock).mockImplementation(async (file: string, content: string) => {
      if (file.endsWith('base.dto.ts') || file.endsWith('index.ts')) throw new Error('EROFS');
      written[file] = content;
    });
    await generateDtos();
    const messages = err.mock.calls.map(c => String(c[0]));
    expect(messages.some(m => m.includes('BaseDto'))).toBe(true);
    expect(messages.some(m => m.includes("fichier d'index"))).toBe(true);
    expect(messages.some(m => m.includes('création du dossier'))).toBe(true);
    (fs.mkdir as jest.Mock).mockReset();
    (fs.writeFile as jest.Mock).mockImplementation(async (file: string, content: string) => { written[file] = content; });
  });
});

describe('gen-dtos : correspondance des types', () => {
  afterEach(() => jest.resetModules());

  it('mappe chaque type Sequelize vers un validateur, clés primaires incluses si configuré', async () => {
    let gen!: typeof import('../../generators/generateDtos');
    jest.isolateModules(() => {
      const types: Record<string, unknown> = {};
      for (const name of ['STRING', 'TEXT', 'ENUM', 'INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'BOOLEAN', 'SMALLINT', 'DATE', 'DATEONLY', 'EMAIL', 'JSON']) {
        types[name.toLowerCase()] = { type: new ({ [name]: class {} } as any)[name]() };
      }
      types.id = { type: new (class INTEGER {})(), primaryKey: true };
      jest.doMock('../../src/databases', () => ({ __esModule: true, default: { Models: { things: { rawAttributes: types } } } }));
      gen = require('../../generators/generateDtos');
    });
    const readFile = jest.spyOn(fs, 'readFile').mockResolvedValueOnce('{"includePrimaryKeys": true}');
    await gen.generateDtos();
    readFile.mockRestore();
    const dto = out('src/dtos/things.dto.ts');
    const create = out('src/dtos/createDtos/things.dto.ts');
    expect(dto).toContain('@IsNumber()\n  public id: number;');
    expect(create).not.toContain('public id');
    for (const f of ['string', 'text', 'enum']) expect(dto).toContain(`@IsString()\n  public ${f}: string;`);
    for (const f of ['integer', 'bigint', 'float', 'double', 'decimal', 'boolean', 'smallint']) expect(dto).toContain(`@IsNumber()\n  public ${f}: number;`);
    for (const f of ['date', 'dateonly']) expect(dto).toContain(`@IsDate()\n  public ${f}: Date;`);
    expect(dto).toContain('@IsEmail()\n  public email: string;');
    expect(dto).toContain('@IsString()\n  public json: any;');
    expect(create).toMatch(/^import \{ IsString, IsNumber, IsDate, IsEmail \} from 'class-validator';/);
  });
});

describe('gen-init-models', () => {
  it('reproduit src/models/init-models.ts', async () => {
    await generateInitModels();
    expect(out('src/models/init-models.ts')).toBe(committed('src/models/init-models.ts'));
  });
});

describe('gen-models', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('passe les arguments sans shell (mot de passe avec espaces et ;)', () => {
    expect(buildSequelizeAutoArgs({ DB_ADDRESS: 'h', DB_NAME: 'd', DB_USERNAME: 'u', DB_DIR_OUTPUT_MODELS: 'o', DB_PORT: '3306', DB_DIALECT: 'mysql', DB_PASSWORD: 'a b;rm -rf', DB_MODELS_IN_TYPESCRIPT: 'true' }))
      .toEqual(['-h', 'h', '-d', 'd', '-u', 'u', '-o', 'o', '-p', '3306', '--dialect', 'mysql', '-x', 'a b;rm -rf', '-l', 'ts']);
    expect(buildSequelizeAutoArgs({ DB_DIALECT: 'mysql' })).not.toContain('-x');
    expect(buildSequelizeAutoArgs({})).not.toContain('-l');
  });

  it('lance sequelize-auto, affiche stdout/stderr et propage les erreurs', async () => {
    const run = execFile as unknown as jest.Mock;
    run.mockImplementationOnce((_cmd, _args, cb) => cb(null, 'done', 'warn'));
    await generateModels();
    expect(run.mock.calls[0][0]).toBe('sequelize-auto');
    expect(log).toHaveBeenCalledWith('Output: done');
    expect(err).toHaveBeenCalledWith('Stderr: warn');
    run.mockImplementationOnce((_cmd, _args, cb) => cb(null, 'ok', ''));
    await generateModels();
    expect(err).toHaveBeenCalledTimes(1);
    run.mockImplementationOnce((_cmd, _args, cb) => cb(new Error('no db')));
    await expect(generateModels()).rejects.toThrow('no db');
  });
});

describe('gen-resource', () => {
  it('exige un nom', async () => {
    await expect(generateResource('')).rejects.toThrow(/Nom de ressource requis/);
  });

  it('écrit service, contrôleur et route (nom nettoyé)', async () => {
    await generateResource('or-ders');
    const files = Object.keys(written).map(f => path.relative(root, f)).sort();
    expect(files).toEqual(['src/controllers/orders.controller.ts', 'src/routes/orders.route.ts', 'src/services/orders.service.ts']);
    expect(out('src/routes/orders.route.ts')).toContain('class OrdersRoute implements Route');
    expect(out('src/routes/orders.route.ts')).toContain("public path = '/orders';");
    expect(out('src/controllers/orders.controller.ts')).toContain('asyncHandler');
    expect(out('src/services/orders.service.ts')).toContain('extends BaseService<T>');
  });
});

describe('gen-docs', () => {
  it('écrit openapi.json et un fichier par tag', () => {
    const dir = fsSync.mkdtempSync(path.join(os.tmpdir(), 'docs-'));
    const doc = generateSwaggerDocs(routes);
    doc.paths['/untagged'] = { get: {} };
    writeSwaggerDocs(doc, path.join(dir, 'api'));
    const files = fsSync.readdirSync(path.join(dir, 'api')).sort();
    expect(files).toEqual(['openapi.json', 'swagger-default.json', 'swagger-products.json', 'swagger-users.json']);
    const products = JSON.parse(fsSync.readFileSync(path.join(dir, 'api', 'swagger-products.json'), 'utf-8'));
    expect(Object.keys(products.paths).every((p: string) => p.startsWith('/products'))).toBe(true);
    expect(products.paths['/products']).toHaveProperty('get');
    expect(products.paths['/products']).toHaveProperty('post');
    fsSync.rmSync(dir, { recursive: true, force: true });
  });
});
