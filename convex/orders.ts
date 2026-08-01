import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    assignedDependentId: v.string(),
    reservationId: v.optional(v.string()),
    customerName: v.optional(v.string()),
    timestamp: v.optional(v.number()),
    username: v.optional(v.string()),
    userRole: v.optional(v.string()),
    deviceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const data = {
      id: args.id,
      tableNumber: args.tableNumber,
      items: args.items,
      totalCUP: args.totalCUP,
      totalUSD: args.totalUSD,
      status: args.status,
      timestamp: args.timestamp || Date.now(),
      assignedDependentId: args.assignedDependentId,
      reservationId: args.reservationId,
      customerName: args.customerName,
    };

    if (args.id) {
      let existingDoc: any = null;
      // 1. Try ctx.db.get if valid Convex ID format
      if (!args.id.startsWith("ORD-") && !args.id.startsWith("temp-") && args.id.length > 5) {
        try {
          existingDoc = await ctx.db.get(args.id as any);
        } catch (e) {
          // Ignore invalid id error
        }
      }
      // 2. If not found by direct ID, search in orders collection
      if (!existingDoc) {
        const allOrders = await ctx.db.query("orders").collect();
        existingDoc = allOrders.find(
          o => o._id === args.id || (o as any).id === args.id || (o.tableNumber === args.tableNumber && Math.abs(o.timestamp - (args.timestamp || 0)) < 10000)
        );
      }

      if (existingDoc) {
        const oldStatus = existingDoc.status;
        await ctx.db.patch(existingDoc._id, data);
        
        if (oldStatus !== args.status) {
          const userStr = args.username || "Dependiente";
          const userRoleStr = args.userRole || "dependiente";
          
          if (args.status === 'in_kitchen' || args.status === 'pending') {
            if (oldStatus === 'pending_dependent' || oldStatus === 'client_pending') {
              // Waiter received/approved client comanda and sent to kitchen
              await ctx.db.insert("bitacora", {
                action: `PEDIDO RECIBIDO POR DEPENDIENTE: El dependiente '${userStr}' recibió/aceptó el pedido entrante de Mesa #${args.tableNumber}`,
                userRole: userRoleStr,
                username: userStr,
                timestamp: Date.now(),
              });
            }
            await ctx.db.insert("bitacora", {
              action: `PEDIDO ENVIADO A COCINA: El dependiente '${userStr}' envió la comanda de Mesa #${args.tableNumber} a Cocina`,
              userRole: userRoleStr,
              username: userStr,
              timestamp: Date.now(),
            });
          } else if (args.status === 'kitchen_in_progress' || args.status === 'in_progress') {
            await ctx.db.insert("bitacora", {
              action: `PEDIDO EN ELABORACIÓN: Cocina inició la elaboración del pedido de Mesa #${args.tableNumber}`,
              userRole: "kitchen",
              username: userStr,
              timestamp: Date.now(),
            });
          } else if (args.status === 'kitchen_ready' || args.status === 'ready_to_serve') {
            await ctx.db.insert("bitacora", {
              action: `PEDIDO LISTO: Cocina marcó el pedido de Mesa #${args.tableNumber} como LISTO`,
              userRole: "kitchen",
              username: userStr,
              timestamp: Date.now(),
            });
            await ctx.db.insert("bitacora", {
              action: `PEDIDO LISTO / AVISO A DEPENDIENTE: Se notificó al dependiente asignado para servir el pedido de Mesa #${args.tableNumber}`,
              userRole: "kitchen",
              username: userStr,
              timestamp: Date.now(),
            });
          } else if (args.status === 'delivered') {
            await ctx.db.insert("bitacora", {
              action: `PEDIDO ENTREGADO: El dependiente '${userStr}' entregó el pedido a Mesa #${args.tableNumber}`,
              userRole: userRoleStr,
              username: userStr,
              timestamp: Date.now(),
            });
          } else if (args.status === 'paid' || args.status === 'closed') {
            await ctx.db.insert("bitacora", {
              action: `PEDIDO COBRADO Y CERRADO: Pedido de Mesa #${args.tableNumber} cobrado y cerrado por ${userStr} ($${args.totalCUP} CUP)`,
              userRole: userRoleStr,
              username: userStr,
              timestamp: Date.now(),
            });
          } else {
            await ctx.db.insert("bitacora", {
              action: `Pedido de Mesa #${args.tableNumber} cambió de estado a '${args.status.toUpperCase()}'`,
              userRole: userRoleStr,
              username: userStr,
              timestamp: Date.now(),
            });
          }
        }
        return existingDoc._id;
      }
    }

    // Insert new order
    const newId = await ctx.db.insert("orders", data);
    const creator = args.username || "Cliente";
    
    await ctx.db.insert("bitacora", {
      action: `PEDIDO CREADO: Nuevo pedido en Mesa #${args.tableNumber} por ${creator} ($${args.totalCUP} CUP)`,
      userRole: args.userRole || "cliente",
      username: creator,
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

// Mutación para crear comandas desde el QR o el camarero (Legacy alias for syncOrUpdateOrder)
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
    status: v.string(),
    assignedDependentId: v.string(),
    reservationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("orders", {
      ...args,
      timestamp: Date.now(),
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
      action: `PEDIDO ENVIADO A COCINA: El dependiente '${args.username}' envió la comanda de Mesa #${order.tableNumber} a Cocina`,
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
      action: `PEDIDO LISTO: Cocina marcó el pedido de Mesa #${order.tableNumber} como LISTO`,
      userRole: "kitchen",
      username: args.username || "Cocina",
      timestamp: now,
    });

    await ctx.db.insert("bitacora", {
      action: `PEDIDO LISTO / AVISO A DEPENDIENTE: Se notificó al dependiente asignado para servir el pedido de Mesa #${order.tableNumber}`,
      userRole: "kitchen",
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
      action: `PEDIDO COBRADO Y CERRADO: Pedido de Mesa #${order.tableNumber} cobrado y cerrado por ${args.username} ($${order.totalCUP} CUP)`,
      userRole: args.userRole,
      username: args.username,
      timestamp: now,
    });

    return { success: true };
  },
});
