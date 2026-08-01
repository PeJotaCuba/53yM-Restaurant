import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Reactive query streaming live operational logs for Manager and Admin
 */
export const getLiveLogs = query({
  args: { 
    limit: v.optional(v.number()),
    requesterRole: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Backend security: Only admin and manager can retrieve the full operational log stream
    if (args.requesterRole !== "admin" && args.requesterRole !== "manager") {
      return [];
    }

    const limit = args.limit ?? 50;
    const logs = await ctx.db
      .query("bitacora")
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
