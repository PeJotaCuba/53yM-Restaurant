/**
 * Utility to clean accented strings (like 'í' or 'é') and object keys
 * before executing database writes on the backend.
 */
export function sanitizeKeys(str: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return sanitizeKeys(obj) as unknown as T;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject) as unknown as T;
  }
  const res: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = sanitizeKeys(key);
    res[cleanKey] = sanitizeObject(value);
  }
  return res as T;
}
