import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new order (customer or waiter) and log to Bitacora
 */
export const createOrder = mutation({
  args: {
    tableNumber: v.string(),
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
    assignedDependentId: v.string(),
    username: v.optional(v.string()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      tableNumber: args.tableNumber,
      items: args.items,
      totalCUP: args.totalCUP,
      totalUSD: args.totalUSD,
      status: "pending_dependent",
      timestamp: now,
      assignedDependentId: args.assignedDependentId,
    });

    const user = args.username || "Cliente/Mesa";
    const role = args.userRole || "cliente";

    // Auto-insert audit log into Bitacora table
    await ctx.db.insert("bitacora", {
      action: `Nuevo pedido creado en Mesa #${args.tableNumber} por $${args.totalCUP} CUP ($${args.totalUSD.toFixed(2)} USD)`,
      userRole: role,
      username: user,
      timestamp: now,
    });

    return orderId;
  },
});

/**
 * Update order status to 'in_kitchen'
 */
export const sendToKitchen = mutation({
  args: {
    orderId: v.id("orders"),
    username: v.string(),
    userRole: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: "in_kitchen",
    });

    // Auto-insert audit log into Bitacora
    await ctx.db.insert("bitacora", {
      action: `Pedido de Mesa #${order.tableNumber} enviado a Cocina por ${args.username}`,
      userRole: args.userRole,
      username: args.username,
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Kitchen updates order status to 'ready_to_serve'
 */
export const markAsReady = mutation({
  args: {
    orderId: v.id("orders"),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: "ready_to_serve",
    });

    // Auto-insert audit log into Bitacora
    await ctx.db.insert("bitacora", {
      action: `Pedido de Mesa #${order.tableNumber} marcado como LISTO PARA SERVIR en Cocina`,
      userRole: "cocina",
      username: args.username || "Cocina",
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Close order as 'paid'
 */
export const closeOrder = mutation({
  args: {
    orderId: v.id("orders"),
    username: v.string(),
    userRole: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: "paid",
    });

    // Auto-insert audit log into Bitacora
    await ctx.db.insert("bitacora", {
      action: `Pedido de Mesa #${order.tableNumber} COBRADO y cerrado por ${args.username} ($${order.totalCUP} CUP)`,
      userRole: args.userRole,
      username: args.username,
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Generic sync or update for orders from frontend
 */
export const syncOrUpdateOrder = mutation({
  args: {
    id: v.optional(v.string()),
    tableNumber: v.string(),
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
    status: v.string(),
    timestamp: v.number(),
    assignedDependentId: v.string(),
    reservationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const data = {
      tableNumber: args.tableNumber,
      items: args.items,
      totalCUP: args.totalCUP,
      totalUSD: args.totalUSD,
      status: args.status,
      timestamp: args.timestamp,
      assignedDependentId: args.assignedDependentId,
      reservationId: args.reservationId,
    };

    if (args.id && !args.id.startsWith("temp-") && args.id.length > 5) {
      try {
        const orderId = args.id as any;
        const existing = await ctx.db.get(orderId) as any;
        if (existing) {
          const oldStatus = existing.status;
          await ctx.db.patch(orderId, data);
          
          if (oldStatus !== args.status) {
            await ctx.db.insert("bitacora", {
              action: `Pedido de Mesa #${args.tableNumber} cambió de estado a '${args.status.toUpperCase()}'`,
              userRole: "sistema",
              username: "Sistema",
              timestamp: Date.now(),
            });
          }
          return orderId;
        }
      } catch (e) {
        console.warn("Error patching order by ID:", e);
      }
    }

    // Insert new order
    const newId = await ctx.db.insert("orders", data);
    
    await ctx.db.insert("bitacora", {
      action: `Nuevo pedido creado en Mesa #${args.tableNumber} por un total de $${args.totalCUP} CUP`,
      userRole: "sistema",
      username: "Sistema",
      timestamp: Date.now(),
    });

    return newId;
  },
});

/**
 * Live reactive query to get all orders
 */
export const getLiveOrders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orders").collect();
  },
});
