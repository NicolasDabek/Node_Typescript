import fs from 'fs/promises';
import path from 'path';
import DB from './src/databases';

const configPath = path.resolve(__dirname, './generateDtos.config.json');

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
  const outputDir = path.resolve(__dirname, './src/dtos');
  const createDtoDir = path.join(outputDir, 'createDtos');

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
            tsType = 'number';
            validator = '@IsNumber()';
            break;
          case 'BOOLEAN':
            tsType = 'boolean';
            validator = '@IsBoolean()';
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

(async () => {
  try {
    const config = await loadConfig();
    const models = DB.Models;
    await generateDtoFiles(models, config);
  } catch (error) {
    console.error('Erreur lors de la génération des DTOs:', error);
  }
})();