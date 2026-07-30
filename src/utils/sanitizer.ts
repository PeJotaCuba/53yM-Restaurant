/**
 * Utility to sanitize strings and dynamic property keys, stripping accents
 * (e.g. 'í', 'é', 'ñ') to ensure safe database synchronization and property access.
 */
export function sanitizeString(str: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function sanitizeObjectKeys<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const cleanKey = sanitizeString(key);
    if (value !== null && typeof value === 'object') {
      sanitized[cleanKey] = sanitizeObjectKeys(value);
    } else {
      sanitized[cleanKey] = value;
    }
  }

  return sanitized;
}
