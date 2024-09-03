import * as fs from 'fs';
import path from 'path';

export class FileUtil {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Lit le contenu d'un fichier.
   * @returns {Promise<string>} Le contenu du fichier.
   */
  async readFile(): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(this.filePath, 'utf-8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  /**
   * Écrit du contenu dans un fichier.
   * @param {string} data - Le contenu à écrire.
   * @returns {Promise<void>}
   */
  async writeFile(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.filePath, data, 'utf-8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Supprime un fichier.
   * @returns {Promise<void>}
   */
  async deleteFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(this.filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Vérifie si un fichier existe.
   * @returns {Promise<boolean>} True si le fichier existe, sinon false.
   */
  async fileExists(): Promise<boolean> {
    return new Promise((resolve) => {
      fs.access(this.filePath, fs.constants.F_OK, (err) => {
        resolve(!err);
      });
    });
  }

  /**
   * Crée un dossier.
   * @param {string} dirPath - Le chemin du dossier à créer.
   * @returns {Promise<void>}
   */
  static async createDirectory(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Lit le contenu d'un dossier.
   * @param {string} dirPath - Le chemin du dossier à lire.
   * @returns {Promise<string[]>} Les fichiers et dossiers dans le dossier.
   */
  static async readDirectory(dirPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(dirPath, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  }

  /**
   * Lit le contenu d'un dossier et des sous dossier.
   * @param {string} dirPath - Le chemin du dossier à lire.
   * @returns {Promise<string[]>} Les fichiers, dossiers et sous-dossier dans le dossier.
   */
  public static async readDirectoryAndSubDirectory(dirPath: string): Promise<Record<string, any>> {
    const directoriesAndFiles: Record<string, {}> = {};

    // Fonction récursive pour lire les fichiers et les sous-dossiers
    const readFileOrSubDirectory = async (currentPath: string, result: Record<string, {}>) => {
      try {
        const files = await fs.promises.readdir(currentPath);

        for (const fileOrFolder of files) {
          const fullPath = path.join(currentPath, fileOrFolder);
          const stats = await fs.promises.stat(fullPath);

          if (stats.isDirectory()) {
            // Créez un objet pour le sous-dossier et le rajoutez au résultat
            const subDirectory: Record<string, {}> = {};
            result[fileOrFolder] = subDirectory;

            // Appelez récursivement la fonction pour traiter le sous-dossier
            await readFileOrSubDirectory(fullPath, subDirectory);
          } else if (stats.isFile()) {
            // Ajoutez le chemin complet du fichier sous le répertoire courant
            if (!result['files']) {
              result['files'] = [];
            }
            (result['files'] as string[]).push(fullPath);
          }
        }
      } catch (err) {
        console.error(`Erreur lors de la lecture de ${currentPath}: ${err.message}`);
      }
    };

    // Commencez la lecture à partir du répertoire racine
    await readFileOrSubDirectory(dirPath, directoriesAndFiles);

    return directoriesAndFiles;
  }

  /**
   * Copie un fichier d'un emplacement à un autre.
   * @param {string} sourcePath - Le chemin du fichier source.
   * @param {string} destPath - Le chemin de destination.
   * @returns {Promise<void>}
   */
  static async copyFile(sourcePath: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.copyFile(sourcePath, destPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Déplace un fichier d'un emplacement à un autre.
   * @param {string} sourcePath - Le chemin du fichier source.
   * @param {string} destPath - Le chemin de destination.
   * @returns {Promise<void>}
   */
  static async moveFile(sourcePath: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.rename(sourcePath, destPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}