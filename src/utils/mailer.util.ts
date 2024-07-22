import nodemailer, { Transporter } from 'nodemailer';

interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
  * @param { string } host - Exemple : 'smtp.gmail.com'
  * @param { number } port - 465 for secure port or 587
  * @param { string } user - User mail
  * @param { string } pass - User password
  */
export class MailerUtil {
  private transporter: Transporter;

  constructor(host: string, port: number, user: string, pass: string) {
    this.transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass
      }
    });
  }

  async sendMail(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail(options);
      console.log('Email sent: %s', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}