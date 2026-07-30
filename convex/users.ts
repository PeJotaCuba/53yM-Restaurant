import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Authorize or activate a user session instantly for a given deviceId
 */
export const authorizeUser = mutation({
  args: {
    username: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("dependent"),
      v.literal("kitchen")
    ),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        name: args.name,
        role: args.role,
        isActive: true,
        loginTime: now,
      });
    } else {
      await ctx.db.insert("users", {
        username: args.username,
        name: args.name,
        role: args.role,
        deviceId: args.deviceId,
        isActive: true,
        loginTime: now,
      });
    }

    // Insert log into Bitacora
    await ctx.db.insert("bitacora", {
      action: `Sesión autorizada/activada para el usuario '${args.username}' (Rol: ${args.role})`,
      userRole: args.role,
      username: args.username,
      timestamp: now,
    });

    return { success: true, deviceId: args.deviceId, role: args.role };
  },
});

/**
 * Get live user session status by deviceId
 */
export const getLiveUserByDeviceId = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    if (!args.deviceId) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
  },
});

/**
 * Get all active users
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * Deactivate a user device session
 */
export const deactivateUser = mutation({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { isActive: false });

      await ctx.db.insert("bitacora", {
        action: `Cierre de sesión / desactivación para usuario '${user.username}'`,
        userRole: user.role,
        username: user.username,
        timestamp: Date.now(),
      });
    }

    return { success: true };
  },
});
