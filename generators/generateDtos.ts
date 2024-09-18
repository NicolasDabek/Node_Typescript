import fs from 'fs/promises';
import path from 'path';
import DB from '../src/databases';

const configPath = path.resolve(__dirname, './configs/generateDtos.config.json');
const outputDir = path.resolve(__dirname, '../src/dtos');
const baseDtoFilePath = path.join(outputDir, 'base.dto.ts')
const indexFilePath = path.join(outputDir, 'index.ts')
const createDtoDir = path.join(outputDir, 'createDtos');

async function loadConfig() {
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error);
    throw error;
  }
}

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Erreur lors de la création du dossier ${dirPath}:`, error);
  }
}

async function generateDtoFiles(models: any, config: any) {
  await ensureDirectoryExists(outputDir);
  await ensureDirectoryExists(createDtoDir);

  // Fonction pour générer les imports à partir des validators utilisés
  const generateImports = (validators: Set<string>) => {
    return validators.size > 0 ? `import { ${[...validators].join(', ')} } from 'class-validator';\n` : '';
  };

  // Template pour CreateDTO
  const createDtoTemplate = (className: string, fields: string, validators: Set<string>) =>
`${generateImports(validators)}
export class Create${className}Dto {
${fields}
}`;

  // Template pour le DTO normal
  const dtoTemplate = (className: string, fields: string, validators: Set<string>) =>
`import { BaseDto } from './base.dto';
${generateImports(validators)}
export class ${className}Dto extends BaseDto {
${fields}
}`;
  for (const modelName in models) {
    if (models.hasOwnProperty(modelName)) {
      const model = models[modelName];
      let dtoFields = '';
      let createDtoFields = '';

      const attributes = model.rawAttributes;
      const primaryKeys = new Set(
        Object.keys(attributes).filter(key => attributes[key].primaryKey)
      );

      const dtoValidators = new Set<string>();
      const createDtoValidators = new Set<string>();

      Object.keys(attributes).forEach((attributeName) => {
        const attribute = attributes[attributeName];
        let tsType = 'any';
        let validator = '@IsString()';

        switch (attribute.type.constructor.name) {
          case 'STRING':
          case 'TEXT':
            tsType = 'string';
            validator = '@IsString()';
            break;
          case 'INTEGER':
          case 'BIGINT':
          case 'FLOAT':
          case 'DOUBLE':
          case 'DECIMAL':
          case 'BOOLEAN':
          case 'SMALLINT':
            tsType = 'number';
            validator = '@IsNumber()';
            break;
          case 'DATE':
          case 'DATEONLY':
            tsType = 'Date';
            validator = '@IsDate()';
            break;
          case 'EMAIL':
            tsType = 'string';
            validator = '@IsEmail()';
            break;
          default:
            tsType = 'any';
            break;
        }

        if (config.includePrimaryKeys || !primaryKeys.has(attributeName)) {
          dtoFields += `  ${validator}\n  public ${attributeName}: ${tsType};\n\n`;

          if (!primaryKeys.has(attributeName)) {
            createDtoFields += `  ${validator}\n  public ${attributeName}: ${tsType};\n\n`;
            createDtoValidators.add(validator.replace(/[@()]/g, ''));
          }

          dtoValidators.add(validator.replace(/[@()]/g, ''));
        }
      });

      dtoFields = dtoFields.trimEnd();
      createDtoFields = createDtoFields.trimEnd();

      const className = modelName.charAt(0).toUpperCase() + modelName.slice(1);

      const dtoFilePath = path.join(outputDir, `${modelName}.dto.ts`);
      const createDtoFilePath = path.join(createDtoDir, `${modelName}.dto.ts`);

      await fs.writeFile(dtoFilePath, dtoTemplate(className, dtoFields, dtoValidators));
      await fs.writeFile(createDtoFilePath, createDtoTemplate(className, createDtoFields, createDtoValidators));
    }
  }
}

const generateBaseDto = async () => {
  const baseDtoContent = `import { IsNumber } from 'class-validator';

export class BaseDto {
  @IsNumber()
  public id: number;
}`;

  try {
    await fs.writeFile(baseDtoFilePath, baseDtoContent);
    console.log(`Base DTO généré : ${baseDtoFilePath}`);
  } catch (error) {
    console.error('Erreur lors de la génération du BaseDto:', error);
  }
};

const updateIndexFile = async () => {
  try {
    const dtoFiles = (await fs.readdir(outputDir)).filter(file => file.endsWith('.dto.ts') && file !== 'base.dto.ts');
    const createDtoFiles = (await fs.readdir(createDtoDir)).filter(file => file.endsWith('.dto.ts'));

    let dtoExports = '';
    let createDtoExports = '';

    dtoFiles.forEach(file => {
      const dtoName = path.basename(file, '.dto.ts');
      const className = dtoName.charAt(0).toUpperCase() + dtoName.slice(1);
      dtoExports += `import { ${className}Dto } from './${dtoName}.dto';\n`;
    });

    createDtoFiles.forEach(file => {
      const dtoName = path.basename(file, '.dto.ts');
      const className = dtoName.charAt(0).toUpperCase() + dtoName.slice(1);
      createDtoExports += `import { Create${className}Dto } from './createDtos/${dtoName}.dto';\n`;
    });

    const indexFileContent =
`${dtoExports}\n${createDtoExports}
export const dtos = {
${dtoFiles.map(file => `  ${path.basename(file, '.dto.ts')}: ${path.basename(file, '.dto.ts').charAt(0).toUpperCase() + path.basename(file, '.dto.ts').slice(1)}Dto`).join(',\n')}
};

export const createDtos = {
${createDtoFiles.map(file => `  ${path.basename(file, '.dto.ts')}: Create${path.basename(file, '.dto.ts').charAt(0).toUpperCase() + path.basename(file, '.dto.ts').slice(1)}Dto`).join(',\n')}
};

export type DtoKeys = keyof typeof dtos;
export type DtoValues = typeof dtos[DtoKeys];

export type CreateDtoKeys = keyof typeof createDtos;
export type CreateDtoValues = typeof createDtos[CreateDtoKeys];`;

    await fs.writeFile(indexFilePath, indexFileContent);
    console.log(`Index généré : ${indexFilePath}`);
  } catch (error) {
    console.error('Erreur lors de la génération du fichier d\'index:', error);
  }
};

(async () => {
  try {
    const config = await loadConfig();
    const models = DB.Models;
    await generateDtoFiles(models, config);
    await generateBaseDto();
    await updateIndexFile();
  } catch (error) {
    console.error('Erreur lors de la génération des DTOs:', error);
  }
})();
