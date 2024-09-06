import { config } from 'dotenv';
import { exec } from 'child_process';

config();

// Construire la commande Sequelize Auto
let command = `sequelize-auto -h ${process.env.DB_ADDRESS} -d ${process.env.DB_NAME} -u ${process.env.DB_USERNAME} -o ${process.env.DB_DIR_OUTPUT_MODELS} -p ${process.env.DB_PORT} --dialect ${process.env.DB_DIALECT}`;

if (process.env.DB_PASSWORD) {
  command += ` -x ${process.env.DB_PASSWORD}`;
}

if (process.env.DB_MODELS_IN_TYPESCRIPT === 'true') {
  command += ` -l ts`;
}

// Exécuter la commande
exec(command, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error: ${err.message}`);
    return;
  }

  console.log(`Output: ${stdout}`);
  
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
  }
});