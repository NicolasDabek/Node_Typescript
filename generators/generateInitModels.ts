import fs from 'fs/promises';
import path from 'path';

const modelsDir = path.resolve(__dirname, '../src/models');
const initPath = path.join(modelsDir, 'init-models.ts');

export async function generateInitModels() {
  const files = (await fs.readdir(modelsDir)).filter(file => file.endsWith('.ts') && file !== 'init-models.ts');
  const names = files.map(file => path.basename(file, '.ts'));

  const imports = names.map(name =>
    `import { ${name} as _${name} } from "./${name}";\nimport type { ${name}Attributes, ${name}CreationAttributes } from "./${name}";`
  ).join('\n');

  const exportModels = names.map(name => `  _${name} as ${name},`).join('\n');
  const exportTypes = names.flatMap(name => [`  ${name}Attributes,`, `  ${name}CreationAttributes,`]).join('\n');
  const inits = names.map(name => `  const ${name} = _${name}.initModel(sequelize);`).join('\n');
  const returned = names.map(name => `    ${name}: ${name},`).join('\n');

  const content = `import type { Sequelize } from "sequelize";\n${imports}\n\nexport {\n${exportModels}\n};\n\nexport type {\n${exportTypes}\n};\n\nexport function initModels(sequelize: Sequelize) {\n${inits}\n\n  return {\n${returned}\n  };\n}\n`;
  await fs.writeFile(initPath, content);
  console.log(`init-models.ts généré (${names.length} modèles)`);
}

if (require.main === module) {
  generateInitModels().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
