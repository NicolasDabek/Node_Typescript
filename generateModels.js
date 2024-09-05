require('dotenv').config();

const { exec } = require('child_process');

const command = `sequelize-auto -h ${process.env.DB_ADDRESS} -d ${process.env.DB_NAME} -u ${process.env.DB_USERNAME} -o ./src/models -p 3306 --dialect mysql -l ts`;

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