export class DateUtil {
  static formatDate(date: Date, format: string): string {
    const options: Intl.DateTimeFormatOptions = {};

    if (format.includes('YYYY')) options.year = 'numeric';
    if (format.includes('MM')) options.month = '2-digit';
    if (format.includes('DD')) options.day = '2-digit';
    if (format.includes('HH')) options.hour = '2-digit';
    if (format.includes('mm')) options.minute = '2-digit';
    if (format.includes('ss')) options.second = '2-digit';

    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }
}
