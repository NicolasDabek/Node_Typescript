// /src/services/fileWriter.service.ts

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export class FileWriterService {
  public static writeFile(fileName: string, data: any): void {
    // Déterminez le chemin du dossier et du fichier
    const dirPath = path.join(__dirname, '../../../dist/src/swaggerDocs');
    const filePath = path.join(dirPath, fileName);

    // Vérifiez si le dossier existe, sinon créez-le
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Déterminez l'extension du fichier
    const ext = path.extname(fileName);

    // Écrivez le fichier en fonction de son extension
    if (ext === '.yaml' || ext === '.yml') {
      fs.writeFileSync(filePath, yaml.dump(data), 'utf8');
    } else {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
  }
}