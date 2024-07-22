import path from 'path';
import { MailerUtil } from './mailer.util';

export class ErrorUtils {
  /**
   * Formatte une erreur pour l'affichage.
   * @param {Error} error - L'erreur à formatter.
   * @returns {string} La chaîne de caractères formatée représentant l'erreur.
   */
  static formatError(error: Error): string {
    return `Error: ${error.name}\nMessage: ${error.message}\nStack: ${error.stack}\n`;
  }

  /**
   * Enregistre une erreur dans un fichier.
   * @param {Error} error - L'erreur à enregistrer.
   * @param {string} filePath - Le chemin du fichier où enregistrer l'erreur.
   * @returns {Promise<void>}
   */
  static async logErrorToFile(error: Error, filePath: string): Promise<void> {
    const fs = await import('fs');
    const errorMessage = this.formatError(error);
    return new Promise((resolve, reject) => {
      fs.appendFile(filePath, `${errorMessage}`, 'utf-8', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Envoie une notification par e-mail en cas d'erreur.
   * @param {Error} error - L'erreur à notifier.
   * @param {string} recipientEmail - L'adresse e-mail du destinataire.
   * @param {string} senderEmail - L'adresse e-mail de l'expéditeur.
   * @param {string} smtpServer - Le serveur SMTP à utiliser.
   * @param {string} smtpUser - L'utilisateur SMTP.
   * @param {string} smtpPassword - Le mot de passe SMTP.
   * @returns {Promise<void>}
   */
  static async notifyErrorByEmail(error: Error, recipientEmail: string, senderEmail: string,
  smtpServer: string, smtpUser: string, smtpPassword: string): Promise<void> {
    const nodemailer = new MailerUtil(smtpServer, 587, smtpUser, smtpPassword);
    const mailOptions = {
      from: senderEmail,
      to: recipientEmail,
      subject: `Error Notification: ${error.name}`,
      text: this.formatError(error)
    };

    return await nodemailer.sendMail(mailOptions);
  }

  /**
   * Crée une erreur personnalisée avec un code d'erreur et des métadonnées supplémentaires.
   * @param {string} message - Le message de l'erreur.
   * @param {number} errorCode - Le code de l'erreur.
   * @param {Record<string, any>} [metadata] - Des métadonnées supplémentaires à associer à l'erreur.
   * @returns {CustomError} Une instance de CustomError.
   */
  static createCustomError(message: string, errorCode: number, metadata?: Record<string, any>): CustomError {
    return new CustomError(message, errorCode, metadata);
  }

  /**
   * Analyse une chaîne de caractères JSON pour en extraire une erreur.
   * @param {string} jsonString - La chaîne de caractères JSON représentant l'erreur.
   * @returns {Error | CustomError} L'erreur extraite de la chaîne de caractères JSON.
   */
  static parseErrorFromJSON(jsonString: string): Error | CustomError {
    try {
      const errorObject = JSON.parse(jsonString);
      if (errorObject.message && errorObject.errorCode !== undefined) {
        return new CustomError(errorObject.message, errorObject.errorCode, errorObject.metadata);
      }
      return new Error(errorObject.message || 'Unknown error');
    } catch {
      return new Error('Invalid JSON string');
    }
  }
}

/**
* Classe représentant une erreur personnalisée.
*/
class CustomError extends Error {
  public errorCode: number;
  public metadata?: Record<string, any>;

  /**
   * Crée une nouvelle instance de CustomError.
   * @param {string} message - Le message de l'erreur.
   * @param {number} errorCode - Le code de l'erreur.
   * @param {Record<string, any>} [metadata] - Des métadonnées supplémentaires à associer à l'erreur.
   */
  constructor(message: string, errorCode: number, metadata?: Record<string, any>) {
    super(message);
    this.name = 'CustomError';
    this.errorCode = errorCode;
    this.metadata = metadata;
  }
}