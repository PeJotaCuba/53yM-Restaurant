import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { logToBitacora } from "./utils";

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

    await logToBitacora(ctx, {
      action: "Jornada reiniciada por el Administrador. Datos operativos y comandas limpiados.",
      userRole: "admin",
      username: "Administrador",
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
    await logToBitacora(ctx, {
      action: `INFORME ENVIADO: El dependiente '${args.report.dependentName}' (@${args.report.dependentUsername}) envió su informe de turno ($${args.report.totalAmountCUP.toLocaleString()} CUP)`,
      userRole: "dependent",
      username: args.report.dependentName || "dependiente",
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
    await logToBitacora(ctx, {
      action: `INFORME ENVIADO: Cocina envió su informe de turno (${args.report.totalDishesPrepared} platos preparados)`,
      userRole: "kitchen",
      username: args.report.chefName || "Cocina",
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

    const actionText = args.isActive ? "JORNADA ABIERTA" : "JORNADA DETENIDA";
    if (args.isActive) {
      if (existing) {
        await ctx.db.patch(existing._id, { value: true });
      } else {
        await ctx.db.insert("settings", { key: "isShiftActive", value: true });
      }
      await ctx.db.insert("bitacora", {
        action: `JORNADA ABIERTA: El Administrador '${args.username}' abrió oficialmente la jornada de operaciones.`,
        userRole: "admin",
        username: args.username,
        timestamp: Date.now(),
      });
    } else {
      await logToBitacora(ctx, {
        action: `JORNADA DETENIDA: El Administrador '${args.username}' detuvo temporalmente la jornada de operaciones.`,
        userRole: "admin",
        username: args.username,
      });
      if (existing) {
        await ctx.db.patch(existing._id, { value: false });
      } else {
        await ctx.db.insert("settings", { key: "isShiftActive", value: false });
      }
    }

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

    // 2. Gather active reservations and filter completed/finished ones for the historical archive
    const reservations = await ctx.db.query("reservations").collect();
    const finishedReservations = reservations.filter(
      (r) => r.status === "cancelled" || r.status === "consolidated"
    );

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

    const comandasSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "comandas"))
      .first();
    const comandas = comandasSetting ? (comandasSetting.value || []) : [];

    // 4. Gather active bitacora logs
    const bitacora = await ctx.db.query("bitacora").collect();

    // 5. Insert snapshot into history table (Historial Integral del Administrador)
    await ctx.db.insert("history", {
      jornadaId,
      dateStr,
      year,
      month,
      day,
      orders,
      reservations: finishedReservations,
      orderReports,
      kitchenReports,
      cashRegisterCloses,
      comandas,
      bitacora,
      timestamp: now,
    });

    // 6. Delete active orders
    for (const o of orders) {
      await ctx.db.delete(o._id);
    }

    // 7. Process reservations upon shift archive:
    // CANCELLED and CONSOLIDATED reservations are archived by removing them from the active `reservations` table
    // (since they are fully captured in the `history` snapshot).
    // PENDING, CANCELLATION_PENDING, CONFIRMED, and PAID reservations remain active in `reservations`.
    for (const r of finishedReservations) {
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
    if (comandasSetting) {
      await ctx.db.patch(comandasSetting._id, { value: [] });
    }

    const gerenteCierreSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "gerenteCierreCompleto"))
      .first();
    if (gerenteCierreSetting) {
      await ctx.db.patch(gerenteCierreSetting._id, { value: false });
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

    return { success: true, jornadaId };
  },
});

export const initializeDatabase = mutation({
  args: {
    requesterRole: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Identity validation
    if (args.requesterRole !== "admin") {
      throw new Error("UNAUTHORIZED: Solo el administrador con rol 'admin' puede realizar la inicialización total del sistema.");
    }

    // 2. Shift state validation
    const shiftActiveSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "isShiftActive"))
      .first();

    if (shiftActiveSetting && shiftActiveSetting.value === true) {
      throw new Error("CONFLICT: No es posible realizar la inicialización mientras exista una jornada activa. Primero debe cerrar y archivar la jornada.");
    }

    // 3. Delete all orders
    const orders = await ctx.db.query("orders").collect();
    for (const o of orders) {
      await ctx.db.delete(o._id);
    }

    // 4. Delete all reservations (all statuses)
    const reservations = await ctx.db.query("reservations").collect();
    for (const r of reservations) {
      await ctx.db.delete(r._id);
    }

    // 5. Delete all history
    const history = await ctx.db.query("history").collect();
    for (const h of history) {
      await ctx.db.delete(h._id);
    }

    // 6. Delete all bitacora entries
    const logs = await ctx.db.query("bitacora").collect();
    for (const l of logs) {
      await ctx.db.delete(l._id);
    }

    // 7. Delete all snapshots
    const snapshots = await ctx.db.query("snapshots").collect();
    for (const s of snapshots) {
      await ctx.db.delete(s._id);
    }

    // 8. Delete all pushSubscriptions
    const pushSubs = await ctx.db.query("pushSubscriptions").collect();
    for (const ps of pushSubs) {
      await ctx.db.delete(ps._id);
    }

    // 9. Reset operational settings keys
    const operationalKeys = [
      "orderReports",
      "kitchenReports",
      "cashRegisterCloses",
      "comandas",
      "notifications",
      "gerenteCierreCompleto"
    ];

    for (const key of operationalKeys) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) {
        if (key === "gerenteCierreCompleto") {
          await ctx.db.patch(existing._id, { value: false });
        } else {
          await ctx.db.patch(existing._id, { value: [] });
        }
      }
    }

    // Ensure isShiftActive is set to false
    if (shiftActiveSetting) {
      await ctx.db.patch(shiftActiveSetting._id, { value: false });
    } else {
      await ctx.db.insert("settings", { key: "isShiftActive", value: false });
    }

    // 10. Delete non-admin users (dependents, managers, kitchen)
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.role !== "admin") {
        await ctx.db.delete(u._id);
      }
    }

    return { success: true };
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

export const restoreDatabase = mutation({
  args: {
    history: v.any(),
    reservations: v.any(),
    requesterRole: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.requesterRole !== "admin") {
      throw new Error("UNAUTHORIZED: Solo el administrador puede restaurar la base de datos.");
    }

    const shiftActiveSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "isShiftActive"))
      .first();

    if (shiftActiveSetting && shiftActiveSetting.value === true) {
      throw new Error("CONFLICT: No se puede restaurar una copia de seguridad mientras la jornada esté activa. Por favor, cierre la jornada primero.");
    }

    // Restore History (Non-Destructive)
    const existingHistory = await ctx.db.query("history").collect();
    const existingHistoryIds = new Set(existingHistory.map(h => h.jornadaId));
    
    if (Array.isArray(args.history)) {
      for (const record of args.history) {
        if (record.jornadaId && !existingHistoryIds.has(record.jornadaId)) {
          const { _id, _creationTime, ...cleanRecord } = record;
          await ctx.db.insert("history", cleanRecord);
        }
      }
    }

    // Restore Reservations (Non-Destructive)
    const existingReservations = await ctx.db.query("reservations").collect();
    const existingReservationKeys = new Set(existingReservations.map(r => (r as any).id || r._id.toString()));
    for (const r of existingReservations) {
      const compositeKey = `${r.customerName}_${r.date}_${r.timeSlot}_${r.createdAt || ''}`;
      existingReservationKeys.add(compositeKey);
    }

    if (Array.isArray(args.reservations)) {
      for (const record of args.reservations) {
        const recKey = (record as any).id || (record as any)._id;
        const compositeKey = `${record.customerName || record.name || ''}_${record.date || ''}_${record.timeSlot || record.time || ''}_${record.createdAt || ''}`;
        if ((!recKey || !existingReservationKeys.has(recKey)) && !existingReservationKeys.has(compositeKey)) {
          const { _id, _creationTime, ...cleanRecord } = record;
          await ctx.db.insert("reservations", cleanRecord);
          if (recKey) existingReservationKeys.add(recKey);
          existingReservationKeys.add(compositeKey);
        }
      }
    }

    // Also extract active operational reservations (pending, cancellation_pending, confirmed, paid) from history snapshots
    if (Array.isArray(args.history)) {
      for (const hDoc of args.history) {
        if (Array.isArray(hDoc?.reservations)) {
          for (const record of hDoc.reservations) {
            if (!record || typeof record !== "object") continue;
            const status = record.status;
            if (
              status === "pending" ||
              status === "cancellation_pending" ||
              status === "confirmed" ||
              status === "paid"
            ) {
              const recKey = record._id ? String(record._id) : (record.id ? String(record.id) : null);
              const compositeKey = `${record.customerName || record.name || ''}_${record.date || ''}_${record.timeSlot || record.time || ''}_${record.createdAt || ''}`;
              if ((!recKey || !existingReservationKeys.has(recKey)) && !existingReservationKeys.has(compositeKey)) {
                const allowedStatuses = ["pending", "confirmed", "paid", "cancelled", "cancellation_pending", "consolidated"];
                let rawStatus = String(record.status || "pending");
                if (!allowedStatuses.includes(rawStatus)) {
                  rawStatus = "pending";
                }

                let formattedDishes: Array<{ name: string; quantity: number; priceCUP?: number }> | undefined = undefined;
                if (Array.isArray(record.dishes) && record.dishes.length > 0) {
                  const tempDishes: Array<{ name: string; quantity: number; priceCUP?: number }> = [];
                  for (const d of record.dishes) {
                    if (d && typeof d === "object") {
                      const item: { name: string; quantity: number; priceCUP?: number } = {
                        name: typeof d.name === "string" && d.name.trim() ? d.name.trim() : (typeof d.title === "string" && d.title.trim() ? d.title.trim() : "Plato"),
                        quantity: typeof d.quantity === "number" && !isNaN(d.quantity) && d.quantity > 0 ? d.quantity : (Math.max(1, Number(d.quantity) || 1)),
                      };
                      if (typeof d.priceCUP === "number" && !isNaN(d.priceCUP)) {
                        item.priceCUP = d.priceCUP;
                      } else if (d.priceCUP !== undefined && d.priceCUP !== null && !isNaN(Number(d.priceCUP))) {
                        item.priceCUP = Number(d.priceCUP);
                      }
                      tempDishes.push(item);
                    }
                  }
                  if (tempDishes.length > 0) {
                    formattedDishes = tempDishes;
                  }
                }

                const cleanRecord: any = {
                  customerName: typeof record.customerName === "string" && record.customerName.trim() ? record.customerName.trim() : (typeof record.name === "string" && record.name.trim() ? record.name.trim() : "Cliente"),
                  date: typeof record.date === "string" && record.date.trim() ? record.date.trim() : new Date().toISOString().split('T')[0],
                  timeSlot: typeof record.timeSlot === "string" && record.timeSlot.trim() ? record.timeSlot.trim() : (typeof record.time === "string" && record.time.trim() ? record.time.trim() : "12:00"),
                  area: typeof record.area === "string" && record.area.trim() ? record.area.trim() : (typeof record.occasion === "string" && record.occasion.trim() ? record.occasion.trim() : "Principal"),
                  guests: typeof record.guests === "number" && !isNaN(record.guests) && record.guests > 0 ? record.guests : Math.max(1, Number(record.guests) || 2),
                  status: rawStatus as any,
                  createdAt: typeof record.createdAt === "number" && !isNaN(record.createdAt) ? record.createdAt : (Number(record.createdAt) || Date.now()),
                };

                const phoneVal = typeof record.phone === "string" ? record.phone : (typeof record.phone === "number" ? String(record.phone) : undefined);
                if (phoneVal && phoneVal.trim()) cleanRecord.phone = phoneVal.trim();

                const emailVal = typeof record.email === "string" ? record.email : undefined;
                if (emailVal && emailVal.trim()) cleanRecord.email = emailVal.trim();

                const occasionVal = typeof record.occasion === "string" ? record.occasion : undefined;
                if (occasionVal && occasionVal.trim()) cleanRecord.occasion = occasionVal.trim();

                const dishRefVal = typeof record.dishReference === "string" ? record.dishReference : undefined;
                if (dishRefVal && dishRefVal.trim()) cleanRecord.dishReference = dishRefVal.trim();

                const tableVal = typeof record.tableNumber === "string" ? record.tableNumber : (typeof record.tableNumber === "number" ? String(record.tableNumber) : undefined);
                if (tableVal && tableVal.trim()) cleanRecord.tableNumber = tableVal.trim();

                if (formattedDishes) cleanRecord.dishes = formattedDishes;

                try {
                  await ctx.db.insert("reservations", cleanRecord);
                  if (recKey) existingReservationKeys.add(recKey);
                  existingReservationKeys.add(compositeKey);
                } catch (insertErr) {
                  console.warn("Error inserting recovered reservation in restoreDatabase:", insertErr, cleanRecord);
                }
              }
            }
          }
        }
      }
    }

    // Log the restoration action in the active bitacora
    await logToBitacora(ctx, {
      action: `RESTAURACIÓN HISTÓRICA EXITOSA: El Administrador '${args.username}' ha restaurado el archivo Excelencia.json. Se han recuperado el Historial y las Reservas sin afectar la operativa.`,
      userRole: "admin",
      username: args.username,
    });

    return { success: true };
  }
});

export const getHistory = query({
  args: {
    requesterRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.requesterRole || args.requesterRole === 'none') {
      return [];
    }
    return await ctx.db.query("history").order("desc").collect();
  },
});
