import fs from 'fs/promises';
import path from 'path';
import DB from './src/databases'; // Assure-toi que ce chemin est correct
import faker from '@faker-js/faker';

// Répertoires pour les tests
const testDir = path.resolve(__dirname, './src/tests');
const modelTestDir = path.join(testDir, 'models');
const modelsDir = path.resolve(__dirname, './src/models'); // Dossier des modèles

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Erreur lors de la création du dossier ${dirPath}:`, error);
  }
}

async function generateModelTests() {
  await ensureDirectoryExists(modelTestDir);
  
  const modelFiles = (await fs.readdir(modelsDir)).filter(file => file.endsWith('.ts') && file !== 'init-models.ts');

  for (const modelFile of modelFiles) {
    const modelName = path.basename(modelFile, '.ts');
    const className = modelName.charAt(0).toUpperCase() + modelName.slice(1);

    const testFilePath = path.join(modelTestDir, `${modelName}.test.ts`);
    const testContent = `import DB from '../../databases';
import faker from '@faker-js/faker';

describe('${className} model', () => {
  let modelInstance: typeof DB.Models.${modelName};

  beforeAll(() => {
    modelInstance = DB.Models.${modelName};
  });

  it('should be defined', () => {
    expect(modelInstance).toBeDefined();
  });

  it('should find a record by primary key', async () => {
    // Assurez-vous qu'un enregistrement avec cet ID existe
    const instance = await modelInstance.findByPk(1); // Remplace 1 par un ID réel si besoin
    expect(instance).not.toBeNull();
  });

  it('should create a new instance', async () => {
    const instance = await modelInstance.create({ 
      // Remplir les champs requis avec des valeurs générées par faker
      pseudo: faker.fakerFR.person.fullName(),
      email: faker.fakerFR.internet.email(),
      password: faker.fakerFR.internet.password(),
      isActive: faker.fakerFR.datatype.boolean(),
      addressIP: faker.fakerFR.internet.ip(),
      dateCreation: new Date()
    });
    expect(instance).toBeDefined();
    expect(instance.id).toBeTruthy(); // Vérifie que l'ID a bien été généré
  });
});`;

    await fs.writeFile(testFilePath, testContent);
    console.log(`Test pour ${className} model généré : ${testFilePath}`);
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
