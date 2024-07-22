export class ClassUtil {
  static getClassName<T>(obj: T): string {
    return obj.constructor.name
  }
}