export class ObjectUtil {
  static filterKeys<T extends Record<string, any>, K extends keyof T>(obj: T, keysToOmit: K[] ): T {
    return Object.keys(obj)
      .filter(key => !keysToOmit.includes(key as K)) // Filtrer les clés à omettre
      .reduce((acc, key) => {
        (acc as T)[key as keyof T] = obj[key as keyof T]; // Reconstruire l'objet sans les clés à omettre
        return acc;
      }, {} as T);
  }
}