import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { logToBitacora } from "./utils";

export const getMesas = query({
  args: {},
  handler: async (ctx) => {
    const mesas = await ctx.db.query("mesas").collect();
    return mesas.sort((a, b) => a.number - b.number);
  },
});

export const createMesa = mutation({
  args: {
    number: v.number(),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mesas")
      .withIndex("by_number", (q) => q.eq("number", args.number))
      .first();
    
    if (existing) {
      throw new Error(`La mesa ${args.number} ya existe.`);
    }

    const publicQrId = `MESA${args.number}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const mesaId = await ctx.db.insert("mesas", {
      number: args.number,
      status: "active",
      publicQrId,
      capacity: args.capacity,
      createdAt: Date.now(),
    });

    return mesaId;
  },
});

export const updateMesa = mutation({
  args: {
    id: v.id("mesas"),
    number: v.number(),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mesas")
      .withIndex("by_number", (q) => q.eq("number", args.number))
      .first();

    if (existing && existing._id !== args.id) {
      throw new Error(`La mesa ${args.number} ya existe.`);
    }

    await ctx.db.patch(args.id, {
      number: args.number,
      capacity: args.capacity,
    });
  },
});

export const updateMesaStatus = mutation({
  args: {
    id: v.id("mesas"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const patches: Record<string, any> = { status: args.status };
    if (args.status === "inactive") {
      patches.token = undefined;
      patches.tokenAssignedAt = undefined;
      patches.tokenExpiresAt = undefined;
    }
    await ctx.db.patch(args.id, patches);
  },
});

export const deleteMesa = mutation({
  args: {
    id: v.id("mesas"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const assignTokens = mutation({
  args: {
    assignments: v.optional(
      v.array(
        v.object({
          id: v.id("mesas"),
          token: v.string(),
          tokenAssignedAt: v.number(),
          tokenExpiresAt: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    // Option A: Direct assignment provided by caller
    if (args.assignments && args.assignments.length > 0) {
      for (const assignment of args.assignments) {
        await ctx.db.patch(assignment.id, {
          token: assignment.token,
          tokenAssignedAt: assignment.tokenAssignedAt,
          tokenExpiresAt: assignment.tokenExpiresAt,
        });
      }
      return args.assignments.length;
    }

    // Option B: Automatic server-side assignment from token_bank setting
    const allMesas = await ctx.db.query("mesas").collect();
    const activeMesas = allMesas.filter((m) => m.status === "active").sort((a, b) => a.number - b.number);

    if (activeMesas.length === 0) {
      throw new Error("No existen mesas activas registradas en el sistema para asignar tokens.");
    }

    const bankSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "token_bank"))
      .first();

    if (!bankSetting || !bankSetting.value || !Array.isArray(bankSetting.value.tokens) || bankSetting.value.tokens.length === 0) {
      throw new Error("No existe un Banco de Tokens generado. Por favor, haz clic en 'Generar Banco de Tokens' primero.");
    }

    const bank = bankSetting.value;
    if (bank.expiresAt && now > bank.expiresAt) {
      throw new Error("El Banco de Tokens ha expirado (validez de 30 días). Por favor, genera un nuevo banco de tokens.");
    }

    const availableTokens: string[] = bank.tokens;
    if (availableTokens.length < activeMesas.length) {
      throw new Error(`El banco de tokens solo contiene ${availableTokens.length} tokens, pero hay ${activeMesas.length} mesas activas.`);
    }

    // Assign unique token to each active mesa
    for (let i = 0; i < activeMesas.length; i++) {
      const mesa = activeMesas[i];
      await ctx.db.patch(mesa._id, {
        token: availableTokens[i],
        tokenAssignedAt: now,
        tokenExpiresAt: expiresAt,
      });
    }

    return activeMesas.length;
  },
});

export const removeToken = mutation({
  args: {
    id: v.id("mesas"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      token: undefined,
      tokenAssignedAt: undefined,
      tokenExpiresAt: undefined,
    });
  },
});

export const occupyMesaByQr = mutation({
  args: {
    publicQrId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Verify mesa exists
    const mesa = await ctx.db
      .query("mesas")
      .withIndex("by_publicQrId", (q) => q.eq("publicQrId", args.publicQrId))
      .first();

    if (!mesa) {
      throw new Error("Mesa no encontrada.");
    }

    // 2. Verify jornada is active
    const jornadaSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "isShiftActive"))
      .first();

    if (!jornadaSetting || !jornadaSetting.value) {
      throw new Error("La jornada no está activa. No se pueden realizar pedidos.");
    }

    // 3. Verify mesa is not already occupied
    if (mesa.occupiedStatus && mesa.occupiedStatus !== "free") {
      throw new Error(`La mesa ${mesa.number} ya está ocupada o en espera de liberación.`);
    }

    const activeSessionId = `SESSION-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const now = Date.now();

    await ctx.db.patch(mesa._id, {
      occupiedStatus: "occupied_qr",
      activeSessionId,
      sessionStartedAt: now,
      sessionUpdatedAt: now,
    });

    await logToBitacora(ctx, {
      action: `MESA OCUPADA (QR): La Mesa #${mesa.number} ha sido ocupada mediante escaneo de QR.`,
      userRole: "sistema",
      username: "Sistema",
    });

    return {
      mesa: { ...mesa, occupiedStatus: "occupied_qr", activeSessionId, sessionStartedAt: now },
      sessionId: activeSessionId,
      status: "occupied_qr"
    };
  },
});

export const confirmMesaPresence = mutation({
  args: {
    mesaId: v.id("mesas"),
    dependentName: v.string(),
  },
  handler: async (ctx, args) => {
    const mesa = await ctx.db.get(args.mesaId);
    if (!mesa) throw new Error("Mesa no encontrada.");

    if (mesa.occupiedStatus !== "waiting_confirmation") {
      throw new Error("La mesa no está esperando confirmación.");
    }

    await ctx.db.patch(args.mesaId, {
      occupiedStatus: "occupied_qr",
      sessionUpdatedAt: Date.now(),
    });

    await logToBitacora(ctx, {
      action: `CONFIRMACIÓN DE PRESENCIA: El dependiente '${args.dependentName}' confirmó físicamente la presencia de la Mesa #${mesa.number}.`,
      userRole: "dependent",
      username: args.dependentName,
    });
  }
});

export const confirmMesaOrderSession = mutation({
  args: {
    mesaId: v.id("mesas"),
  },
  handler: async (ctx, args) => {
    const mesa = await ctx.db.get(args.mesaId);
    if (!mesa) throw new Error("Mesa no encontrada.");

    if (mesa.occupiedStatus !== "occupied_qr") {
      throw new Error("La mesa no tiene una sesión QR pendiente de confirmación.");
    }

    await ctx.db.patch(args.mesaId, {
      occupiedStatus: "waiting_confirmation",
      sessionUpdatedAt: Date.now(),
    });

    await logToBitacora(ctx, {
      action: `CONFIRMACIÓN PENDIENTE: La Mesa #${mesa.number} envió un pedido por QR y espera confirmación del dependiente.`,
      userRole: "sistema",
      username: "Sistema",
    });
  }
});

export const releaseMesa = mutation({
  args: {
    mesaId: v.id("mesas"),
  },
  handler: async (ctx, args) => {
    const mesa = await ctx.db.get(args.mesaId);
    if (!mesa) throw new Error("Mesa no encontrada.");

    await ctx.db.patch(args.mesaId, {
      occupiedStatus: "free",
      activeSessionId: undefined,
      sessionStartedAt: undefined,
      sessionUpdatedAt: Date.now(),
    });

    await logToBitacora(ctx, {
      action: `MESA LIBERADA: La Mesa #${mesa.number} fue liberada.`,
      userRole: "sistema",
      username: "Sistema",
    });
  }
});

export const setMesaWaitingReactivation = mutation({
  args: {
    mesaId: v.id("mesas"),
  },
  handler: async (ctx, args) => {
    const mesa = await ctx.db.get(args.mesaId);
    if (!mesa) throw new Error("Mesa no encontrada.");

    await ctx.db.patch(args.mesaId, {
      occupiedStatus: "waiting_reactivation",
      sessionUpdatedAt: Date.now(),
    });
  }
});

export const reactivateMesa = mutation({
  args: {
    mesaId: v.id("mesas"),
  },
  handler: async (ctx, args) => {
    const mesa = await ctx.db.get(args.mesaId);
    if (!mesa) throw new Error("Mesa no encontrada.");

    await ctx.db.patch(args.mesaId, {
      occupiedStatus: "free",
      activeSessionId: undefined,
      sessionStartedAt: undefined,
      sessionUpdatedAt: Date.now(),
    });

    await logToBitacora(ctx, {
      action: `MESA REACTIVADA: La Mesa #${mesa.number} fue reactivada para nuevos clientes.`,
      userRole: "sistema",
      username: "Sistema",
    });
  }
});
