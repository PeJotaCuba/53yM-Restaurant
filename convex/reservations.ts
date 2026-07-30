import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { sanitizeObject } from "./utils";

export const getLiveReservations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reservations").collect();
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

    await ctx.db.insert("bitacora", {
      action: `Nueva reserva creada por ${cleanArgs.customerName} para el ${cleanArgs.date} (${cleanArgs.timeSlot}, ${cleanArgs.guests} pers.)`,
      userRole: "cliente",
      username: cleanArgs.customerName,
      timestamp: now,
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
    await ctx.db.insert("bitacora", {
      action: `Nueva Reserva + Pedido: ${cleanArgs.customerName} para el ${cleanArgs.date} ($${cleanArgs.totalCUP} CUP)`,
      userRole: "cliente",
      username: cleanArgs.customerName,
      timestamp: now,
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
      v.literal("cancellation_pending")
    ),
    username: v.string(),
    userRole: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanArgs = sanitizeObject(args);
    const res = await ctx.db.get(cleanArgs.id);
    if (!res) throw new Error("Reservation not found");

    await ctx.db.patch(cleanArgs.id, { status: cleanArgs.status });

    await ctx.db.insert("bitacora", {
      action: `Reserva de ${res.customerName} marcada como ${cleanArgs.status.toUpperCase()} por ${cleanArgs.username}`,
      userRole: cleanArgs.userRole,
      username: cleanArgs.username,
      timestamp: Date.now(),
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

    await ctx.db.insert("bitacora", {
      action: `Reserva de ${existing.customerName} editada por cliente (mantenida en PENDIENTE para aprobación de administrador)`,
      userRole: "cliente",
      username: cleanArgs.customerName,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

