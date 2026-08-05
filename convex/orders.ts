import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { logToBitacora } from "./utils";

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
    comandaId: v.optional(v.string()),
    timestamp: v.optional(v.number()),
    username: v.optional(v.string()),
    userRole: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
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
      comandaId: args.comandaId,
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
              await logToBitacora(ctx, {
                action: `PEDIDO RECIBIDO POR DEPENDIENTE: El dependiente '${userStr}' recibió/aceptó el pedido entrante de Mesa #${args.tableNumber}`,
                userRole: userRoleStr,
                username: userStr,
              });
            }
            await logToBitacora(ctx, {
              action: `PEDIDO ENVIADO A COCINA: El dependiente '${userStr}' envió la comanda de Mesa #${args.tableNumber} a Cocina`,
              userRole: userRoleStr,
              username: userStr,
            });
          } else if (args.status === 'kitchen_in_progress' || args.status === 'in_progress') {
            await logToBitacora(ctx, {
              action: `PEDIDO EN ELABORACIÓN: Cocina inició la elaboración del pedido de Mesa #${args.tableNumber}`,
              userRole: "kitchen",
              username: userStr,
            });
          } else if (args.status === 'kitchen_ready' || args.status === 'ready_to_serve') {
            await logToBitacora(ctx, {
              action: `PEDIDO LISTO: Cocina marcó el pedido de Mesa #${args.tableNumber} como LISTO`,
              userRole: "kitchen",
              username: userStr,
            });
            await logToBitacora(ctx, {
              action: `PEDIDO LISTO / AVISO A DEPENDIENTE: Se notificó al dependiente asignado para servir el pedido de Mesa #${args.tableNumber}`,
              userRole: "kitchen",
              username: userStr,
            });
          } else if (args.status === 'delivered') {
            await logToBitacora(ctx, {
              action: `PEDIDO ENTREGADO: El dependiente '${userStr}' entregó el pedido a Mesa #${args.tableNumber}`,
              userRole: userRoleStr,
              username: userStr,
            });
          } else if (args.status === 'paid' || args.status === 'closed') {
            await logToBitacora(ctx, {
              action: `PEDIDO COBRADO Y CERRADO: Pedido de Mesa #${args.tableNumber} cobrado y cerrado por ${userStr} ($${args.totalCUP} CUP)`,
              userRole: userRoleStr,
              username: userStr,
            });
          } else {
            await logToBitacora(ctx, {
              action: `Pedido de Mesa #${args.tableNumber} cambió de estado a '${args.status.toUpperCase()}'`,
              userRole: userRoleStr,
              username: userStr,
            });
          }
        }
        return existingDoc._id;
      }
    }

    // Insert new order
    const jornadaSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "isShiftActive"))
      .first();

    if (!jornadaSetting || !jornadaSetting.value) {
      throw new Error("La jornada no está activa. No se pueden crear pedidos nuevos.");
    }

    if (args.sessionId) {
      const mesaNumberMatch = args.tableNumber.match(/\d+/);
      if (mesaNumberMatch) {
        const mNum = parseInt(mesaNumberMatch[0]);
        const mesa = await ctx.db.query("mesas").withIndex("by_number", q => q.eq("number", mNum)).first();
        
        if (!mesa) throw new Error("Mesa no encontrada.");

        if (mesa.activeSessionId !== args.sessionId) {
          throw new Error("Sesión inválida o expirada para esta mesa.");
        }

        if (mesa.occupiedStatus !== "occupied_qr" && mesa.occupiedStatus !== "waiting_confirmation") {
          throw new Error("El estado actual de la mesa no permite enviar pedidos desde el QR.");
        }
      }
    }

    const newId = await ctx.db.insert("orders", data);
    const creator = args.username || "Cliente";
    
    await logToBitacora(ctx, {
      action: `PEDIDO CREADO: Nuevo pedido en Mesa #${args.tableNumber} por ${creator} ($${args.totalCUP} CUP)`,
      userRole: args.userRole || "cliente",
      username: creator,
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
    customerName: v.optional(v.string()),
    comandaId: v.optional(v.string()),
    username: v.optional(v.string()),
    userRole: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const jornadaSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "isShiftActive"))
      .first();

    if (!jornadaSetting || !jornadaSetting.value) {
      throw new Error("La jornada no está activa. No se pueden crear pedidos nuevos.");
    }

    if (args.sessionId) {
      const mesaNumberMatch = args.tableNumber.match(/\d+/);
      if (mesaNumberMatch) {
        const mNum = parseInt(mesaNumberMatch[0]);
        const mesa = await ctx.db.query("mesas").withIndex("by_number", q => q.eq("number", mNum)).first();
        
        if (!mesa) throw new Error("Mesa no encontrada.");

        if (mesa.activeSessionId !== args.sessionId) {
          throw new Error("Sesión inválida o expirada para esta mesa.");
        }

        if (mesa.occupiedStatus !== "occupied_qr" && mesa.occupiedStatus !== "waiting_confirmation") {
          throw new Error("El estado actual de la mesa no permite enviar pedidos desde el QR.");
        }
      }
    }

    const orderId = await ctx.db.insert("orders", {
      tableNumber: args.tableNumber,
      items: args.items,
      totalCUP: args.totalCUP,
      totalUSD: args.totalUSD,
      status: args.status,
      assignedDependentId: args.assignedDependentId,
      reservationId: args.reservationId,
      customerName: args.customerName,
      comandaId: args.comandaId,
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
    await logToBitacora(ctx, {
      action: `PEDIDO ENVIADO A COCINA: El dependiente '${args.username}' envió la comanda de Mesa #${order.tableNumber} a Cocina`,
      userRole: args.userRole,
      username: args.username,
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
    await logToBitacora(ctx, {
      action: `PEDIDO LISTO: Cocina marcó el pedido de Mesa #${order.tableNumber} como LISTO`,
      userRole: "kitchen",
      username: args.username || "Cocina",
    });

    await logToBitacora(ctx, {
      action: `PEDIDO LISTO / AVISO A DEPENDIENTE: Se notificó al dependiente asignado para servir el pedido de Mesa #${order.tableNumber}`,
      userRole: "kitchen",
      username: args.username || "Cocina",
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
    await logToBitacora(ctx, {
      action: `PEDIDO COBRADO Y CERRADO: Pedido de Mesa #${order.tableNumber} cobrado y cerrado por ${args.username} ($${order.totalCUP} CUP)`,
      userRole: args.userRole,
      username: args.username,
    });

    return { success: true };
  },
});
