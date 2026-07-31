import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").collect();
    const result: Record<string, any> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  },
});

export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return setting ? setting.value : null;
  },
});

export const updateSetting = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("settings", { key: args.key, value: args.value });
    }
    return { success: true };
  },
});

export const resetWorkday = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Delete all orders (comandas)
    const orders = await ctx.db.query("orders").collect();
    for (const o of orders) {
      await ctx.db.delete(o._id);
    }
    // 2. Delete all reservations
    const reservations = await ctx.db.query("reservations").collect();
    for (const r of reservations) {
      await ctx.db.delete(r._id);
    }
    // 3. Delete non-admin users (dependents, managers, kitchen)
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.role !== "admin") {
        await ctx.db.delete(u._id);
      }
    }
    // 4. Clear bitacora logs (since audit log was downloaded)
    const logs = await ctx.db.query("bitacora").collect();
    for (const l of logs) {
      await ctx.db.delete(l._id);
    }
    // Note: cashRegisterCloses (comprobantes de pago / recibos) are preserved

    await ctx.db.insert("bitacora", {
      action: "Jornada reiniciada por el Administrador. Datos operativos y comandas limpiados.",
      userRole: "admin",
      username: "Administrador",
      timestamp: Date.now(),
    });
    return { success: true };
  },
});
