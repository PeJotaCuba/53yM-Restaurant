import { AppData } from '../types';

export const ADMIN_DEVICE_IDS = ['DVC-DZX0G', 'DVC-BXX2N', 'DVC-U30C5', 'DVC-IVO4Z', 'DVC-JK4SI'];

/**
 * Checks if a given deviceId is registered either in code (Admin)
 * or by the administrator in data (Dependents, Managers, Custom Admin IDs).
 */
export function isDeviceRegistered(deviceId: string, data?: AppData): boolean {
  if (!deviceId) return false;
  const cleanId = deviceId.trim().toUpperCase();

  // 1. Check hardcoded Admin Device IDs
  if (ADMIN_DEVICE_IDS.includes(cleanId)) return true;

  if (!data) return false;

  // 2. Check custom Admin Device IDs from adminConfig if present
  if (data.adminConfig) {
    const customAdmin = (data.adminConfig as any).deviceId || (data.adminConfig as any).deviceIds;
    if (typeof customAdmin === 'string' && customAdmin.trim().toUpperCase() === cleanId) return true;
    if (Array.isArray(customAdmin) && customAdmin.some((id: string) => id.trim().toUpperCase() === cleanId)) return true;
  }

  // 3. Check Dependents Device IDs
  if (data.dependents && data.dependents.some(d => d.deviceId && d.deviceId.trim().toUpperCase() === cleanId && d.isActive !== false)) {
    return true;
  }

  // 4. Check Managers Device IDs
  if (data.managers && data.managers.some(m => m.deviceId && m.deviceId.trim().toUpperCase() === cleanId && m.isActive !== false)) {
    return true;
  }

  return false;
}
