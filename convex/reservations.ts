import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { sanitizeObject, logToBitacora } from "./utils";

export const getLiveReservations = query({
  args: {},
  handler: async (ctx) => {
    // Limitamos a las últimas 300 reservas para optimizar rendimiento de operación diaria 
    // sin borrar los registros físicos históricos.
    return await ctx.db.query("reservations").order("desc").take(300);
  },
});

export const createReservation = mutation({
  args: {
    customerName: v.string(),
    date: v.string(),
    timeSlot: v.string(),
    area: v.string(),
    guests: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    occasion: v.optional(v.string()),
    dishReference: v.optional(v.string()),
    dishes: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          priceCUP: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const cleanArgs = sanitizeObject(args);
    const now = Date.now();
    const id = await ctx.db.insert("reservations", {
      customerName: cleanArgs.customerName,
      date: cleanArgs.date,
      timeSlot: cleanArgs.timeSlot,
      area: cleanArgs.area,
      guests: cleanArgs.guests,
      status: "pending",
      createdAt: now,
      phone: cleanArgs.phone,
      email: cleanArgs.email,
      occasion: cleanArgs.occasion,
      dishReference: cleanArgs.dishReference,
      dishes: cleanArgs.dishes,
    });

    await logToBitacora(ctx, {
      action: `Nueva reserva creada por ${cleanArgs.customerName} para el ${cleanArgs.date} (${cleanArgs.timeSlot}, ${cleanArgs.guests} pers.)`,
      userRole: "cliente",
      username: cleanArgs.customerName,
    });

    return id;
  },
});

export const createReservationAndOrder = mutation({
  args: {
    customerName: v.string(),
    date: v.string(),
    timeSlot: v.string(),
    area: v.string(),
    guests: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    occasion: v.optional(v.string()),
    dishReference: v.optional(v.string()),
    items: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        quantity: v.number(),
        priceCUP: v.number(),
        priceUSD: v.number(),
        notes: v.optional(v.string()),
      })
    ),
    totalCUP: v.number(),
    totalUSD: v.number(),
  },
  handler: async (ctx, args) => {
    const cleanArgs = sanitizeObject(args);
    const now = Date.now();

    // 1. Insert reservation
    const reservationId = await ctx.db.insert("reservations", {
      customerName: cleanArgs.customerName,
      date: cleanArgs.date,
      timeSlot: cleanArgs.timeSlot,
      area: cleanArgs.area,
      guests: cleanArgs.guests,
      status: "pending",
      createdAt: now,
      phone: cleanArgs.phone,
      email: cleanArgs.email,
      occasion: cleanArgs.occasion,
      dishReference: cleanArgs.dishReference,
      dishes: cleanArgs.items.map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        priceCUP: it.priceCUP,
      })),
    });

    // 2. Insert order
    const orderId = await ctx.db.insert("orders", {
      tableNumber: `Reserva - ${cleanArgs.customerName}`,
      items: cleanArgs.items,
      totalCUP: cleanArgs.totalCUP,
      totalUSD: cleanArgs.totalUSD,
      status: "pending_dependent",
      timestamp: now,
      assignedDependentId: "no_assigned",
      reservationId: reservationId,
    });

    // 3. Insert bitacora log
    await logToBitacora(ctx, {
      action: `Nueva Reserva + Pedido: ${cleanArgs.customerName} para el ${cleanArgs.date} ($${cleanArgs.totalCUP} CUP)`,
      userRole: "cliente",
      username: cleanArgs.customerName,
    });

    return { reservationId, orderId };
  },
});

export const updateReservationStatus = mutation({
  args: {
    id: v.id("reservations"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("paid"),
      v.literal("cancelled"),
      v.literal("cancellation_pending"),
      v.literal("consolidated")
    ),
    username: v.string(),
    userRole: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanArgs = sanitizeObject(args);
    const res = await ctx.db.get(cleanArgs.id);
    if (!res) throw new Error("Reservation not found");

    await ctx.db.patch(cleanArgs.id, { status: cleanArgs.status });

    await logToBitacora(ctx, {
      action: `Reserva de ${res.customerName} marcada como ${cleanArgs.status.toUpperCase()} por ${cleanArgs.username}`,
      userRole: cleanArgs.userRole,
      username: cleanArgs.username,
    });

    return { success: true };
  },
});

export const updateReservation = mutation({
  args: {
    id: v.id("reservations"),
    customerName: v.string(),
    date: v.string(),
    timeSlot: v.string(),
    guests: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    occasion: v.optional(v.string()),
    dishReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanArgs = sanitizeObject(args);
    const existing = await ctx.db.get(cleanArgs.id);
    if (!existing) throw new Error("Reservation not found");

    await ctx.db.patch(cleanArgs.id, {
      customerName: cleanArgs.customerName,
      date: cleanArgs.date,
      timeSlot: cleanArgs.timeSlot,
      guests: cleanArgs.guests,
      phone: cleanArgs.phone,
      email: cleanArgs.email,
      occasion: cleanArgs.occasion,
      dishReference: cleanArgs.dishReference,
      status: "pending", // resets to pending on edit
    });

    await logToBitacora(ctx, {
      action: `Reserva de ${existing.customerName} editada por cliente (mantenida en PENDIENTE para aprobación de administrador)`,
      userRole: "cliente",
      username: cleanArgs.customerName,
    });

    return { success: true };
  },
});

export const deleteReservation = mutation({
  args: { 
    id: v.id("reservations"), 
    username: v.string(), 
    userRole: v.string() 
  },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.id);
    if (!res) throw new Error("Reservation not found");
    if (res.status !== "cancelled") throw new Error("Solo las reservaciones canceladas pueden ser eliminadas.");
    
    await ctx.db.delete(args.id);
    
    await logToBitacora(ctx, {
      action: `Reserva de ${res.customerName} ELIMINADA permanentemente por ${args.username}`,
      userRole: args.userRole,
      username: args.username,
    });
    return { success: true };
  }
});

export const recoverHistoricalReservations = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const existingReservations = await ctx.db.query("reservations").collect();
      const existingKeys = new Set<string>();

      for (const r of existingReservations) {
        if (r._id) existingKeys.add(String(r._id));
        if ((r as any).id) existingKeys.add(String((r as any).id));
        const key = `${r.customerName || ''}_${r.date || ''}_${r.timeSlot || ''}_${r.createdAt || ''}`;
        existingKeys.add(key);
      }

      const historyDocs = await ctx.db.query("history").collect();
      let recoveredCount = 0;

      for (const doc of historyDocs) {
        if (Array.isArray(doc?.reservations)) {
          for (const record of doc.reservations) {
            if (!record || typeof record !== "object") continue;
            const status = record.status;
            if (
              status === "pending" ||
              status === "cancellation_pending" ||
              status === "confirmed" ||
              status === "paid"
            ) {
              const recId = record._id ? String(record._id) : (record.id ? String(record.id) : null);
              const compositeKey = `${record.customerName || record.name || ''}_${record.date || ''}_${record.timeSlot || record.time || ''}_${record.createdAt || ''}`;

              const alreadyExists =
                (recId && existingKeys.has(recId)) ||
                existingKeys.has(compositeKey);

              if (!alreadyExists) {
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
                  if (recId) existingKeys.add(recId);
                  existingKeys.add(compositeKey);
                  recoveredCount++;
                } catch (insertErr) {
                  console.warn("Error inserting recovered historical reservation:", insertErr, cleanRecord);
                }
              }
            }
          }
        }
      }

      return { success: true, recoveredCount };
    } catch (handlerErr) {
      console.warn("Failed recoverHistoricalReservations:", handlerErr);
      return { success: false, recoveredCount: 0 };
    }
  },
});


