jest.mock('../../generators/generateModels', () => ({ generateModels: jest.fn() }));
jest.mock('../../generators/generateInitModels', () => ({ generateInitModels: jest.fn() }));
jest.mock('../../generators/generateDtos', () => ({ generateDtos: jest.fn() }));
jest.mock('../../generators/generateTests', () => ({ generateModelTests: jest.fn() }));
jest.mock('../../generators/generateResource', () => ({ generateResource: jest.fn() }));
jest.mock('../../generators/swagger/generateSwaggerDocs', () => ({ generateSwaggerDocs: jest.fn(() => 'DOC'), writeSwaggerDocs: jest.fn() }));

import { main } from '../../generators/cli';
import { generateModels } from '../../generators/generateModels';
import { generateInitModels } from '../../generators/generateInitModels';
import { generateDtos } from '../../generators/generateDtos';
import { generateModelTests } from '../../generators/generateTests';
import { generateResource } from '../../generators/generateResource';
import { writeSwaggerDocs } from '../../generators/swagger/generateSwaggerDocs';

describe('generators/cli', () => {
  let log: jest.SpyInstance; let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  it("n'exécute rien à l'import", () => {
    expect(generateModels).not.toHaveBeenCalled();
  });

  it.each([
    ['models', generateModels], ['init-models', generateInitModels], ['dtos', generateDtos], ['tests', generateModelTests],
  ])('%s', async (cmd, fn) => {
    await main([cmd]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('docs et resource', async () => {
    await main(['docs']);
    expect(writeSwaggerDocs).toHaveBeenCalledWith('DOC');
    await main(['resource', 'orders']);
    expect(generateResource).toHaveBeenCalledWith('orders');
  });

  it('all enchaîne tout et tolère un échec de gen-models', async () => {
    (generateModels as jest.Mock).mockRejectedValueOnce(new Error('no db'));
    await main(['all']);
    expect(warn).toHaveBeenCalledWith('gen-models ignoré:', 'no db');
    for (const fn of [generateInitModels, generateDtos, writeSwaggerDocs, generateModelTests]) expect(fn).toHaveBeenCalledTimes(1);
  });

  it('affiche l’aide sinon (argv par défaut)', async () => {
    await main();
    await main(['?']);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });
});
