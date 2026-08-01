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
export const getActiveKitchenUser = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.and(
        q.eq(q.field("role"), "kitchen"),
        q.eq(q.field("isActive"), true)
      ))
      .first();
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
    // Uniqueness constraint for active kitchen account
    if (args.role === "kitchen" && args.isActive) {
      const activeKitchenUsers = await ctx.db
        .query("users")
        .filter((q) => q.and(
          q.eq(q.field("role"), "kitchen"),
          q.eq(q.field("isActive"), true)
        ))
        .collect();

      const activeOther = activeKitchenUsers.find(u => u.username !== args.username);
      if (activeOther) {
        throw new Error(`Ya existe una cuenta de Cocina activa (${activeOther.name || activeOther.username}). Debe desactivarla antes de activar otra.`);
      }
    }

    const existing = await ctx.db
      .query("users")
      .filter((q) => q.and(
        q.eq(q.field("username"), args.username),
        q.eq(q.field("role"), args.role)
      ))
      .first();

    const now = Date.now();
    let actText = "";
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
      actText = `Usuario '${args.username}' (Rol: ${args.role.toUpperCase()}) MODIFICADO / ${args.isActive ? 'ACTIVADO' : 'DESACTIVADO'}`;
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
      actText = `Usuario '${args.username}' (Rol: ${args.role.toUpperCase()}) CREADO y ${args.isActive ? 'ACTIVADO' : 'DESACTIVADO'}`;
    }

    await ctx.db.insert("bitacora", {
      action: actText,
      userRole: "admin",
      username: "Administrador",
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Upsert or toggle active kitchen profile with strict uniqueness
 */
export const upsertKitchenUser = mutation({
  args: {
    username: v.string(),
    name: v.string(),
    password: v.optional(v.string()),
    phone: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.isActive) {
      const activeKitchenUsers = await ctx.db
        .query("users")
        .filter((q) => q.and(
          q.eq(q.field("role"), "kitchen"),
          q.eq(q.field("isActive"), true)
        ))
        .collect();

      const activeOther = activeKitchenUsers.find(u => u.username !== args.username);
      if (activeOther) {
        throw new Error(`Ya existe una cuenta de Cocina activa ('${activeOther.name || activeOther.username}'). Debe desactivarla antes de activar o crear otra.`);
      }
    }

    const existing = await ctx.db
      .query("users")
      .filter((q) => q.and(
        q.eq(q.field("username"), args.username),
        q.eq(q.field("role"), "kitchen")
      ))
      .first();

    const now = Date.now();
    const devId = args.deviceId || `kitchen-${args.username}`;

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        isActive: args.isActive,
        password: args.password ?? existing.password,
        phone: args.phone ?? existing.phone,
        deviceId: devId,
        loginTime: now,
      });

      await ctx.db.insert("bitacora", {
        action: `Perfil de Cocina ('${args.name}') ${args.isActive ? 'ACTIVADO / MODIFICADO' : 'DESACTIVADO'}`,
        userRole: "admin",
        username: "Administrador",
        timestamp: now,
      });
      return { success: true, id: existing._id };
    } else {
      const newId = await ctx.db.insert("users", {
        username: args.username,
        name: args.name,
        role: "kitchen",
        deviceId: devId,
        isActive: args.isActive,
        password: args.password || "1234",
        phone: args.phone || "",
        loginTime: now,
      });

      await ctx.db.insert("bitacora", {
        action: `Perfil de Cocina ('${args.name}') CREADO y ${args.isActive ? 'ACTIVADO' : 'DESACTIVADO'}`,
        userRole: "admin",
        username: "Administrador",
        timestamp: now,
      });
      return { success: true, id: newId };
    }
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
      await ctx.db.insert("bitacora", {
        action: `Usuario '${args.username}' (Rol: ${args.role.toUpperCase()}) ELIMINADO`,
        userRole: "admin",
        username: "Administrador",
        timestamp: Date.now(),
      });
    }
    return { success: true };
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
