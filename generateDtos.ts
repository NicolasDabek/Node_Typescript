import fs from 'fs';
import path from 'path';
import DB from './src/databases'; // TypeScript import

// Charger la configuration
const configPath = path.resolve(__dirname, './generateDtos.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Fonction pour s'assurer que les répertoires existent
const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Répertoires pour les DTOs
const outputDir = path.resolve(__dirname, './src/dtos');
const createDtoDir = path.join(outputDir, 'createDtos');

// Assurer que les répertoires pour les DTOs existent
ensureDirectoryExists(outputDir);
ensureDirectoryExists(createDtoDir);

const models = DB.Models;

// Fonction pour obtenir le type et le validateur
const getTypeAndValidator = (attribute: any): { tsType: string, validator: string } => {
  switch (attribute.type.constructor.name) {
    case 'STRING':
    case 'TEXT':
      return { tsType: 'string', validator: '@IsString()' };
    case 'INTEGER':
    case 'BIGINT':
    case 'FLOAT':
    case 'DOUBLE':
    case 'DECIMAL':
      return { tsType: 'number', validator: '@IsNumber()' };
    case 'BOOLEAN':
      return { tsType: 'boolean', validator: '@IsBoolean()' };
    case 'DATE':
    case 'DATEONLY':
      return { tsType: 'Date', validator: '@IsDate()' };
    case 'EMAIL':
      return { tsType: 'string', validator: '@IsEmail()' };
    default:
      return { tsType: 'any', validator: '@IsOptional()' };
  }
};

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

// Générer les fichiers DTO
for (const modelName in models) {
  if (models.hasOwnProperty(modelName)) {
    const model = models[modelName];
    
    // Préparation des champs pour les DTOs
    let dtoFields = '';
    let createDtoFields = '';

    const attributes = model.rawAttributes;
    const primaryKeys = new Set(
      Object.keys(attributes).filter(key => attributes[key].primaryKey)
    );

    // Objets pour suivre les validators utilisés
    const dtoValidators = new Set<string>();
    const createDtoValidators = new Set<string>();

    Object.keys(attributes).forEach((attributeName) => {
      const attribute = attributes[attributeName];
      const { tsType, validator } = getTypeAndValidator(attribute);

      // Ajout des champs pour les DTOs selon la config
      if (config.includePrimaryKeys || !primaryKeys.has(attributeName)) {
        dtoFields += `  ${validator}\n  public ${attributeName}: ${tsType};\n\n`;

        // N'ajouter que les validateurs des attributs qui ne sont pas des clés primaires dans CreateDTOs
        if (!primaryKeys.has(attributeName)) {
          createDtoFields += `  ${validator}\n  public ${attributeName}: ${tsType};\n\n`;
          
          // Ajouter le validateur uniquement s'il n'est pas une clé primaire
          createDtoValidators.add(validator.replace(/[@()]/g, ''));
        }

        // Ajouter le validateur uniquement pour les champs non clés primaires dans DTO
        dtoValidators.add(validator.replace(/[@()]/g, ''));
      }
    });

    // Supprimer les derniers \n\n pour éviter les espaces superflus
    dtoFields = dtoFields.trimEnd();
    createDtoFields = createDtoFields.trimEnd();

    // Nom de la classe DTO
    const className = modelName.charAt(0).toUpperCase() + modelName.slice(1);

    // Génération des fichiers DTO
    const dtoFilePath = path.join(outputDir, `${modelName}.dto.ts`);
    const createDtoFilePath = path.join(createDtoDir, `${modelName}.dto.ts`);

    fs.writeFileSync(dtoFilePath, dtoTemplate(className, dtoFields, dtoValidators));
    if (config.verbose) {
      console.log(`DTO généré : ${dtoFilePath}`);
    }

    fs.writeFileSync(createDtoFilePath, createDtoTemplate(className, createDtoFields, createDtoValidators));
    if (config.verbose) {
      console.log(`CreateDTO généré : ${createDtoFilePath}`);
    }
  }
}

// Mettre à jour l'index
const updateIndexFile = () => {
  const dtoFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.dto.ts'));
  const createDtoFiles = fs.readdirSync(createDtoDir).filter(file => file.endsWith('.dto.ts'));

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

  fs.writeFileSync(path.join(outputDir, 'index.ts'), indexFileContent);
  if (config.verbose) {
    console.log(`Index généré : ${path.join(outputDir, 'index.ts')}`);
  }
};

// Mettre à jour l'index après la génération des DTOs
updateIndexFile();