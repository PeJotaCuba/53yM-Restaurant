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

/**
 * Checks whether the shift is currently active (isShiftActive === true).
 */
export async function isShiftActive(ctx: { db: any }): Promise<boolean> {
  const setting = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", "isShiftActive"))
    .first();
  return setting ? setting.value === true : false;
}

/**
 * Safely inserts a log entry into bitacora ONLY if the shift is active (isShiftActive === true).
 * No events are recorded in bitacora before the Administrator opens the shift or after shift is closed.
 */
export async function logToBitacora(
  ctx: { db: any },
  entry: { action: string; userRole: string; username: string; timestamp?: number }
) {
  const active = await isShiftActive(ctx);
  if (!active) {
    return;
  }

  await ctx.db.insert("bitacora", {
    action: entry.action,
    userRole: entry.userRole,
    username: entry.username,
    timestamp: entry.timestamp ?? Date.now(),
  });
}
