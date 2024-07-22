export class StringUtil {
  static capitalize(word: string): string {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  static reverseString(word: string): string {
    return word.split('').reverse().join('');
  }

  static isPalindrome(word: string): boolean {
    const reversed = StringUtil.reverseString(word)
    return word === reversed
  }

  static randomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}
