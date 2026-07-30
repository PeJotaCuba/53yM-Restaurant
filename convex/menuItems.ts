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
