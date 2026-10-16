import { config } from 'dotenv';
import { execFile } from 'child_process';

config();

/**
 * Arguments de sequelize-auto. Passés tels quels (sans shell) : un mot de passe contenant
 * des espaces, des guillemets ou `;` n'est ni coupé ni interprété.
 */
export function buildSequelizeAutoArgs(env: NodeJS.ProcessEnv = process.env): string[] {
  const args = [
    '-h', String(env.DB_ADDRESS),
    '-d', String(env.DB_NAME),
    '-u', String(env.DB_USERNAME),
    '-o', String(env.DB_DIR_OUTPUT_MODELS),
    '-p', String(env.DB_PORT),
    '--dialect', String(env.DB_DIALECT),
  ];
  if (env.DB_PASSWORD) args.push('-x', env.DB_PASSWORD);
  if (env.DB_MODELS_IN_TYPESCRIPT === 'true') args.push('-l', 'ts');
  return args;
}

export function generateModels(): Promise<void> {
  return new Promise<void>((resolve, reject) => execFile('sequelize-auto', buildSequelizeAutoArgs(), (err, stdout, stderr) => {
    if (err) {
      reject(err);
      return;
    }

    console.log(`Output: ${stdout}`);

    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    resolve();
  }));
}

/* istanbul ignore next -- point d'entrée en ligne de commande */
if (require.main === module) {
  generateModels().catch(err => console.error(`Error: ${err.message}`));
}
