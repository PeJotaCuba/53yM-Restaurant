import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("reservations", {
      customerName: args.customerName,
      date: args.date,
      timeSlot: args.timeSlot,
      area: args.area,
      guests: args.guests,
      status: "pending",
      createdAt: now,
    });

    await ctx.db.insert("bitacora", {
      action: `Nueva reserva creada por ${args.customerName} para el ${args.date} (${args.timeSlot}, ${args.guests} pers.)`,
      userRole: "cliente",
      username: args.customerName,
      timestamp: now,
    });

    return id;
  },
});

export const updateReservationStatus = mutation({
  args: {
    id: v.id("reservations"),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("cancelled")),
    username: v.string(),
    userRole: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await ctx.db.get(args.id);
    if (!res) throw new Error("Reservation not found");

    await ctx.db.patch(args.id, { status: args.status });

    await ctx.db.insert("bitacora", {
      action: `Reserva de ${res.customerName} marcada como ${args.status.toUpperCase()} por ${args.username}`,
      userRole: args.userRole,
      username: args.username,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
