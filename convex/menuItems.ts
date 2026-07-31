import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getLiveMenuItems = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("menuItems").collect();
  },
});

export const toggleMenuItemAvailability = mutation({
  args: {
    id: v.id("menuItems"),
    isAvailable: v.boolean(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Menu item not found");

    await ctx.db.patch(args.id, { isAvailable: args.isAvailable });

    await ctx.db.insert("bitacora", {
      action: `Plato '${item.name}' cambiado a ${args.isAvailable ? 'DISPONIBLE' : 'AGOTADO'} por ${args.username}`,
      userRole: "gerente/admin",
      username: args.username,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export const syncMenuItems = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        priceCUP: v.number(),
        priceUSD: v.number(),
        isAvailable: v.boolean(),
        image: v.optional(v.string()),
      })
    ),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("menuItems").collect();
    const existingMap = new Map(existing.map(e => [e.name.toLowerCase().trim(), e]));
    const incomingNames = new Set(args.items.map(i => i.name.toLowerCase().trim()));

    for (const item of existing) {
      if (!incomingNames.has(item.name.toLowerCase().trim())) {
        await ctx.db.delete(item._id);
      }
    }

    for (const item of args.items) {
      const key = item.name.toLowerCase().trim();
      const found = existingMap.get(key);
      if (found) {
        await ctx.db.patch(found._id, item);
      } else {
        await ctx.db.insert("menuItems", item);
      }
    }
    await ctx.db.insert("bitacora", {
      action: `Menú actualizado por ${args.username} (${args.items.length} platos)`,
      userRole: "admin/gerente",
      username: args.username,
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

