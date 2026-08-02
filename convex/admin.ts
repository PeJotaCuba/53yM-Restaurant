import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

    const oldValue = existing ? existing.value : null;

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("settings", { key: args.key, value: args.value });
    }

    // Server-side push delivery trigger for notifications
    if (args.key === "notifications" && Array.isArray(args.value)) {
      const newNotifs = args.value;
      const oldNotifs = Array.isArray(oldValue) ? oldValue : [];
      
      // Identify strictly new notifications (by id)
      const oldIds = new Set(oldNotifs.map((n: any) => n.id));
      const newlyAdded = newNotifs.filter((n: any) => !oldIds.has(n.id));

      for (const notif of newlyAdded) {
        // Schedule push delivery for each new notification
        // Target role can be specific or 'all'
        await ctx.scheduler.runAfter(0, (internal as any).notifications.sendPushNotificationInternal, {
          role: notif.targetRole || "all",
          title: notif.title || "Restaurante 53&M",
          body: notif.message || "Nueva notificación",
          tag: notif.id
        });
      }
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

export const appendOrderReport = mutation({
  args: { report: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "orderReports"))
      .first();

    let reports = [];
    if (existing) {
      reports = existing.value || [];
      if (!Array.isArray(reports)) {
        reports = [];
      }
    }

    reports = [args.report, ...reports];

    if (existing) {
      await ctx.db.patch(existing._id, { value: reports });
    } else {
      await ctx.db.insert("settings", { key: "orderReports", value: reports });
    }

    // Insert audit log to bitacora
    await ctx.db.insert("bitacora", {
      action: `INFORME ENVIADO: El dependiente '${args.report.dependentName}' (@${args.report.dependentUsername}) envió su informe de turno ($${args.report.totalAmountCUP.toLocaleString()} CUP)`,
      userRole: "dependent",
      username: args.report.dependentName || "dependiente",
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

export const appendKitchenReport = mutation({
  args: { report: v.any() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "kitchenReports"))
      .first();

    let reports = [];
    if (existing) {
      reports = existing.value || [];
      if (!Array.isArray(reports)) {
        reports = [];
      }
    }

    reports = [args.report, ...reports];

    if (existing) {
      await ctx.db.patch(existing._id, { value: reports });
    } else {
      await ctx.db.insert("settings", { key: "kitchenReports", value: reports });
    }

    // Insert audit log to bitacora
    await ctx.db.insert("bitacora", {
      action: `INFORME ENVIADO: Cocina envió su informe de turno (${args.report.totalDishesPrepared} platos preparados)`,
      userRole: "kitchen",
      username: args.report.chefName || "Cocina",
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

export const toggleShiftActive = mutation({
  args: {
    requesterRole: v.string(),
    username: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.requesterRole !== "admin") {
      throw new Error("UNAUTHORIZED: Solo el administrador puede abrir o cerrar la jornada.");
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "isShiftActive"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.isActive });
    } else {
      await ctx.db.insert("settings", { key: "isShiftActive", value: args.isActive });
    }

    const actionText = args.isActive ? "JORNADA ABIERTA" : "JORNADA DETENIDA";
    await ctx.db.insert("bitacora", {
      action: `${actionText}: El Administrador '${args.username}' ${args.isActive ? 'abrió oficialmente la jornada de operaciones' : 'detuvo temporalmente la jornada de operaciones'}.`,
      userRole: "admin",
      username: args.username,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const closeWorkdayAndArchive = mutation({
  args: {
    requesterRole: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.requesterRole !== "admin") {
      throw new Error("UNAUTHORIZED: Solo el administrador puede cerrar y archivar la jornada.");
    }

    const now = Date.now();
    const dateObj = new Date(now);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1; // 1-indexed
    const day = dateObj.getDate();
    const dateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    const jornadaId = `JORNADA-${now}`;

    // 1. Gather all active orders
    const orders = await ctx.db.query("orders").collect();

    // 2. Gather all active reservations
    const reservations = await ctx.db.query("reservations").collect();

    // 3. Gather reports from settings
    const orderReportsSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "orderReports"))
      .first();
    const orderReports = orderReportsSetting ? (orderReportsSetting.value || []) : [];

    const kitchenReportsSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "kitchenReports"))
      .first();
    const kitchenReports = kitchenReportsSetting ? (kitchenReportsSetting.value || []) : [];

    const cashRegisterClosesSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "cashRegisterCloses"))
      .first();
    const cashRegisterCloses = cashRegisterClosesSetting ? (cashRegisterClosesSetting.value || []) : [];

    // 4. Gather active bitacora logs
    const bitacora = await ctx.db.query("bitacora").collect();

    // 5. Insert snapshot into history table
    await ctx.db.insert("history", {
      jornadaId,
      dateStr,
      year,
      month,
      day,
      orders,
      reservations,
      orderReports,
      kitchenReports,
      cashRegisterCloses,
      bitacora,
      timestamp: now,
    });

    // 6. Delete active orders
    for (const o of orders) {
      await ctx.db.delete(o._id);
    }

    // 7. Delete active reservations
    for (const r of reservations) {
      await ctx.db.delete(r._id);
    }

    // 8. Delete active bitacora
    for (const b of bitacora) {
      await ctx.db.delete(b._id);
    }

    // 9. Reset settings for reports and closes for the next shift
    if (orderReportsSetting) {
      await ctx.db.patch(orderReportsSetting._id, { value: [] });
    }
    if (kitchenReportsSetting) {
      await ctx.db.patch(kitchenReportsSetting._id, { value: [] });
    }
    if (cashRegisterClosesSetting) {
      await ctx.db.patch(cashRegisterClosesSetting._id, { value: [] });
    }

    // 10. Deactivate shift (isShiftActive = false)
    const shiftActiveSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "isShiftActive"))
      .first();
    if (shiftActiveSetting) {
      await ctx.db.patch(shiftActiveSetting._id, { value: false });
    } else {
      await ctx.db.insert("settings", { key: "isShiftActive", value: false });
    }

    // 11. Write the start log for the next jornada in the cleared bitacora
    await ctx.db.insert("bitacora", {
      action: `JORNADA CERRADA Y ARCHIVADA: El Administrador '${args.username}' cerró la jornada anterior de forma exitosa.`,
      userRole: "admin",
      username: args.username,
      timestamp: Date.now(),
    });

    return { success: true, jornadaId };
  },
});

export const createSnapshot = mutation({
  args: {
    data: v.any(),
    createdBy: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("snapshots", {
      data: args.data,
      timestamp: Date.now(),
      createdBy: args.createdBy,
      label: args.label,
    });

    await ctx.db.insert("bitacora", {
      action: `BACKUP EXCELENCIA: Se ha generado un respaldo completo del sistema (${args.label}).`,
      userRole: "admin",
      username: args.createdBy,
      timestamp: Date.now(),
    });

    return id;
  },
});

export const getHistory = query({
  args: {
    requesterRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.requesterRole !== "admin" && args.requesterRole !== "manager") {
      return [];
    }
    return await ctx.db.query("history").order("desc").collect();
  },
});
