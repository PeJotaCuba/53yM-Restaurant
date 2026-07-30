import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Reactive query streaming live operational logs for Manager and Admin
 */
export const getLiveLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const logs = await ctx.db
      .query("bitacora")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Manual insertion for custom audit events
 */
export const addLog = mutation({
  args: {
    action: v.string(),
    userRole: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("bitacora", {
      action: args.action,
      userRole: args.userRole,
      username: args.username,
      timestamp: now,
    });
    return { success: true };
  },
});
