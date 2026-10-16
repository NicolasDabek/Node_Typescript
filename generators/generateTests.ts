import DB from '../src/databases';
import { resolveCrudModel } from '../src/crud/registry';
import fs from 'fs/promises';
import path from 'path';
import { DataTypes } from 'sequelize';

// Dossier des tests
const testDir = path.resolve(__dirname, '../tests');
// Dossier des tests pour les modèles
const modelTestDir = path.join(testDir, 'models');
// Dossier des modèles à utiliser pour générer des tests
const modelsDir = path.resolve(__dirname, '../src/models');

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Erreur lors de la création du dossier ${dirPath}:`, error);
  }
}

export function generateFakeData(attributes: any) {
  const instanceData: { [key: string]: any } = {};

  for (const key in attributes) {
    const attribute = attributes[key];
    // Déterminer le type de l'attribut et générer des données en conséquence
    if (attribute.type instanceof DataTypes.STRING) {
      instanceData[key] = "test-string"; // Exemple pour les chaînes de caractères
    } else if (attribute.type instanceof DataTypes.INTEGER) {
      instanceData[key] = 1; // Générer un entier
    } else if (attribute.type instanceof DataTypes.BOOLEAN) {
      instanceData[key] = Math.round(Math.random()); // Un booléen est un tinyInt avec MySQL
    } else if (attribute.type instanceof DataTypes.DATE) {
      instanceData[key] = new Date(); // Générer la date actuelle
    } else if (attribute.type instanceof DataTypes.FLOAT || attribute.type instanceof DataTypes.DECIMAL) {
      instanceData[key] = parseFloat((Math.random() * 100).toFixed(2)); // Générer un float avec précision
    }
  }
  return instanceData;
}

export async function generateRelatedData(model: any) {
  const associations = model.associations;
  const relatedData: { [key: string]: any } = {};

  for (const associationName in associations) {
    const association = associations[associationName];
    
    if (association.associationType === 'BelongsTo' || association.associationType === 'HasOne') {
      const relatedModel = association.target;
      const relatedInstance = await relatedModel.create(generateFakeData(relatedModel.rawAttributes));
      relatedData[association.foreignKey] = relatedInstance[relatedModel.primaryKeyAttribute];
    }
    
    // Pour les relations "HasMany", tu peux envisager de créer plusieurs instances liées si nécessaire.
    if (association.associationType === 'HasMany') {
      const relatedModel = association.target;
      const relatedInstances = await relatedModel.bulkCreate([generateFakeData(relatedModel.rawAttributes)]);
      relatedData[association.foreignKey] = relatedInstances.map((inst: any) => inst[relatedModel.primaryKeyAttribute]);
    }
  }

  return relatedData;
}

// Champs numériques que mysql2 peut renvoyer en chaîne (DECIMAL...) : comparés en nombre
function getNumericFields(attributes: any): string[] {
  return Object.keys(attributes).filter(key => {
    const type = attributes[key].type;
    return type instanceof DataTypes.DECIMAL || type instanceof DataTypes.FLOAT || type instanceof DataTypes.DOUBLE;
  });
}

function blockedModelTestTemplate(modelName: string, className: string, primaryKey: string): string {
  return `import request from 'supertest';
import { app } from '../../src/index';
import { generateFakeData } from '../../generators/generateTests';
import { ${modelName} } from '../../src/models/${modelName}';

// Le modèle ${modelName} est volontairement bloqué sur le CRUD générique
// (CRUD_BLOCKED_MODELS) : on vérifie qu'il reste inaccessible.
describe('${className} API (CRUD générique bloqué)', () => {
  it('refuse la création via le CRUD générique', async () => {
    const { ${primaryKey}, ...data } = generateFakeData(${modelName}.rawAttributes);
    const response = await request(app.app).post('/${modelName}').send(data);
    expect([401, 403]).toContain(response.statusCode);
  });

  it('refuse la lecture via le CRUD générique', async () => {
    const response = await request(app.app).get('/${modelName}/1');
    expect([401, 403]).toContain(response.statusCode);
  });
});
`;
}

function crudModelTestTemplate(modelName: string, className: string, primaryKey: string, numericFields: string[], withHooks: boolean): string {
  const hooksBefore = withHooks ? `
  beforeAll(async () => {
    await app.dbSequelize.sequelize.sync({ force: true });
  });
` : '';
  const hooksAfter = withHooks ? `
  afterAll(async () => {
    await app.dbSequelize.sequelize.close();
  });
` : '';
  const compare = numericFields.length
    ? `    // Les champs numériques (DECIMAL...) peuvent être renvoyés en chaîne par mysql2 : on les compare en nombre
    const { ${numericFields.join(', ')}, ...rest } = createdData as any;
    expect(getResponse.body.datas).toMatchObject(rest);
${numericFields.map(f => `    expect(Number(getResponse.body.datas.${f})).toBeCloseTo(Number(${f}));`).join('\n')}`
    : `    expect(getResponse.body.datas).toMatchObject(createdData);`;

  return `import request from 'supertest';
import { app } from '../../src/index';
import { generateFakeData } from '../../generators/generateTests';
import { ${modelName} } from '../../src/models/${modelName}';

describe('${className} API', () => {
  let transaction: any;
  const instanceData = generateFakeData(${modelName}.rawAttributes);
  let createdData: ${modelName};
${hooksBefore}
  beforeEach(async () => {
    transaction = await app.dbSequelize.sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });
${hooksAfter}
  it('should create a new ${modelName}', async () => {
    const { ${primaryKey}, ...restInstanceData } = instanceData;
    const response = await request(app.app)
      .post('/${modelName}')
      .send(restInstanceData);
    createdData = response.body.datas;
    expect(response.statusCode).toEqual(201);
    expect(response.body.datas).toHaveProperty('${primaryKey}');
  });

  it('should find a ${modelName} by ID', async () => {
    const idCreatedData = createdData.${primaryKey};
    const getResponse = await request(app.app)
      .get(\`/${modelName}/\${idCreatedData}\`)
      .expect(200);
    expect(getResponse.body.datas).toHaveProperty('${primaryKey}', idCreatedData);
${compare}
  });

  it('should update an existing ${modelName}', async () => {
    const idCreatedData = createdData.${primaryKey};
    const updatedData = generateFakeData(${modelName}.rawAttributes);
    const { ${primaryKey}, ...restUpdatedData } = updatedData;
    const updateResponse = await request(app.app)
      .put(\`/${modelName}/\${idCreatedData}\`)
      .send(restUpdatedData);
    expect(updateResponse.statusCode).toEqual(200);
    expect(updateResponse.body.datas).not.toEqual(createdData);
    createdData = updateResponse.body.datas;
  });

  it('should delete an existing ${modelName}', async () => {
    const idCreatedData = createdData.${primaryKey};
    await request(app.app)
      .delete(\`/${modelName}/\${idCreatedData}\`)
      .expect(200);

    await request(app.app)
      .get(\`/${modelName}/\${idCreatedData}\`)
      .expect(404);
  });

  it('should return 404 for non-existent ${modelName}', async () => {
    const nonExistentId = 999999;
    await request(app.app)
      .get(\`/${modelName}/\${nonExistentId}\`)
      .expect(404);
  });
});
`;
}

export async function generateModelTests() {
  await ensureDirectoryExists(modelTestDir);

    const modelFiles = (await fs.readdir(modelsDir)).filter(file => file.endsWith('.ts') && file !== 'init-models.ts');
  let hooksAlreadyUsed = false;

  for (const modelFile of modelFiles) {
    const modelName = path.basename(modelFile, '.ts');
    const className = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    const testFilePath = path.join(modelTestDir, `${modelName}.test.ts`);
    const attributes = DB.Models[modelName].rawAttributes;
    const primaryKey = Object.keys(attributes).find(key => attributes[key].primaryKey) || 'id';

    let testContent: string;
    if (!resolveCrudModel(modelName).exposed) {
      testContent = blockedModelTestTemplate(modelName, className, primaryKey);
    } else {
      testContent = crudModelTestTemplate(modelName, className, primaryKey, getNumericFields(attributes), !hooksAlreadyUsed);
      hooksAlreadyUsed = true;
    }

    await fs.writeFile(testFilePath, testContent);
    console.log(`Test pour ${className} généré : ${testFilePath}`);
  }
}

/* istanbul ignore next -- point d'entrée en ligne de commande */
if (require.main === module) (async () => {
  try {
    console.log('Génération des tests pour modèles...');
    await generateModelTests();
  } catch (error) {
    console.error('Erreur lors de la génération des tests:', error);
  }
})();