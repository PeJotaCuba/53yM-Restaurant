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

    const mesaId = await ctx.db.insert("mesas", {
      number: args.number,
      status: "active",
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
    assignments: v.array(
      v.object({
        id: v.id("mesas"),
        token: v.string(),
        tokenAssignedAt: v.number(),
        tokenExpiresAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const assignment of args.assignments) {
      await ctx.db.patch(assignment.id, {
        token: assignment.token,
        tokenAssignedAt: assignment.tokenAssignedAt,
        tokenExpiresAt: assignment.tokenExpiresAt,
      });
    }
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
