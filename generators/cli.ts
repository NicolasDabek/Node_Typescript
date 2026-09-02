import { generateModels } from './generateModels';
import { generateInitModels } from './generateInitModels';
import { generateDtos } from './generateDtos';
import { generateModelTests } from './generateTests';
import { generateResource } from './generateResource';
import { generateSwaggerDocs, writeSwaggerDocs } from './swagger/generateSwaggerDocs';
import { routes } from '../src/routes';

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  switch (cmd) {
    case 'models':
      await generateModels();
      break;
    case 'init-models':
      await generateInitModels();
      break;
    case 'dtos':
      await generateDtos();
      break;
    case 'tests':
      await generateModelTests();
      break;
    case 'docs':
      writeSwaggerDocs(generateSwaggerDocs(routes));
      break;
    case 'resource':
      await generateResource(arg);
      break;
    case 'all':
      try { await generateModels(); } catch (e: any) { console.warn('gen-models ignoré:', e.message); }
      await generateInitModels();
      await generateDtos();
      writeSwaggerDocs(generateSwaggerDocs(routes));
      await generateModelTests();
      break;
    default:
      console.log(`Usage:
  npx ts-node generators/cli.ts models
  npx ts-node generators/cli.ts init-models
  npx ts-node generators/cli.ts dtos
  npx ts-node generators/cli.ts tests
  npx ts-node generators/cli.ts docs
  npx ts-node generators/cli.ts resource <name>
  npx ts-node generators/cli.ts all`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
