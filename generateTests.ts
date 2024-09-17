import DB from './src/databases';
import fs from 'fs/promises';
import path from 'path';
import { DataTypes } from 'sequelize';

// Répertoires pour les tests
const testDir = path.resolve(__dirname, 'tests');
const modelTestDir = path.join(testDir, 'models');
const modelsDir = path.resolve(__dirname, 'src/models'); // Dossier des modèles

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
      instanceData[key] = new Date(); // Générer une date actuelle
    } else if (attribute.type instanceof DataTypes.FLOAT || attribute.type instanceof DataTypes.DECIMAL) {
      instanceData[key] = parseFloat((Math.random() * 100).toFixed(2)); // Générer un float avec précision
    }
    // Ajouter plus de conditions selon les types d'attributs
  }
  return instanceData;
}

async function generateModelTests() {
  await ensureDirectoryExists(modelTestDir);

  const modelFiles = (await fs.readdir(modelsDir)).filter(file => file.endsWith('.ts') && file !== 'init-models.ts');

  for (const modelFile of modelFiles) {
    const modelName = path.basename(modelFile, '.ts');
    const className = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    const testFilePath = path.join(modelTestDir, `${modelName}.test.ts`);
    const primaryKey = Object.keys(DB.Models[modelName].rawAttributes).find(key => DB.Models[modelName].rawAttributes[key].primaryKey);

    const testContent = `import request from 'supertest';
import { app } from '../../src/index';
import { generateFakeData } from '../../generateTests';
import { ${modelName} } from '../../src/models/${modelName}';

describe('${className} API', () => {
  let transaction: any;
  const instanceData = generateFakeData(${modelName}.rawAttributes);
  let createdData: ${modelName};

  beforeAll(async () => {
    await app.dbSequelize.sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    transaction = await app.dbSequelize.sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  afterAll(async () => {
    await app.dbSequelize.sequelize.close();
  });

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
    expect(getResponse.body.datas).toMatchObject(createdData);
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
});`;

    await fs.writeFile(testFilePath, testContent);
    console.log(`Test pour ${className} généré : ${testFilePath}`);
  }
}

(async () => {
  try {
    console.log('Génération des tests pour modèles...');
    await generateModelTests();
  } catch (error) {
    console.error('Erreur lors de la génération des tests:', error);
  }
})();