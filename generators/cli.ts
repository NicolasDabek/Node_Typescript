import { generateModels } from './generateModels';
import { generateInitModels } from './generateInitModels';
import { generateDtos } from './generateDtos';
import { generateModelTests } from './generateTests';
import { generateResource } from './generateResource';
import { generateSwaggerDocs, writeSwaggerDocs } from './swagger/generateSwaggerDocs';
import { routes } from '../src/routes';

export async function main(argv: string[] = process.argv.slice(2)) {
  const [cmd, arg] = argv;
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

// Exécuté seulement en ligne de commande : l'import (tests) ne lance rien.
/* istanbul ignore next -- point d'entrée en ligne de commande */
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
