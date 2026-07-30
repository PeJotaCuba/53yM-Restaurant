import { query, mutation } from "./_generated/server";
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

/**
 * Upsert a user (manager, dependent, etc.) for real-time synchronization
 */
export const upsertUser = mutation({
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
    isActive: v.boolean(),
    password: v.optional(v.string()),
    phone: v.optional(v.string()),
    tableNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.and(
        q.eq(q.field("username"), args.username),
        q.eq(q.field("role"), args.role)
      ))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        deviceId: args.deviceId,
        isActive: args.isActive,
        loginTime: now,
        password: args.password,
        phone: args.phone,
        tableNumber: args.tableNumber,
      });
    } else {
      await ctx.db.insert("users", {
        username: args.username,
        name: args.name,
        role: args.role,
        deviceId: args.deviceId,
        isActive: args.isActive,
        loginTime: now,
        password: args.password,
        phone: args.phone,
        tableNumber: args.tableNumber,
      });
    }
    return { success: true };
  },
});

/**
 * Remove a user by username and role
 */
export const removeUserByUsername = mutation({
  args: {
    username: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("dependent"),
      v.literal("kitchen")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.and(
        q.eq(q.field("username"), args.username),
        q.eq(q.field("role"), args.role)
      ))
      .first();

    if (user) {
      await ctx.db.delete(user._id);
    }
    return { success: true };
  },
});

/**
 * Set authorized admin device IDs (up to 3 total)
 */
export const setAdminAuthorizedIds = mutation({
  args: {
    authorizedAdminIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const configRecord = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), "admin_config_doc"))
      .first();

    if (configRecord) {
      await ctx.db.patch(configRecord._id, {
        authorizedAdminIds: args.authorizedAdminIds,
      });
    } else {
      await ctx.db.insert("users", {
        username: "admin_config_doc",
        name: "Configuración de Administrador",
        role: "admin",
        deviceId: "SYSTEM",
        isActive: true,
        loginTime: Date.now(),
        authorizedAdminIds: args.authorizedAdminIds,
      });
    }
    return { success: true };
  },
});

/**
 * Get authorized admin device IDs
 */
export const getAdminAuthorizedIds = query({
  args: {},
  handler: async (ctx) => {
    const configRecord = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), "admin_config_doc"))
      .first();

    return configRecord?.authorizedAdminIds || [];
  },
});

export const getLiveUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .first();
  },
});
