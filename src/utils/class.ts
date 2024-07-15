export function getClassName<T>(obj: T): string {
  return obj.constructor.name
}