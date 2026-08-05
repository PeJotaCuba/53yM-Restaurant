import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
