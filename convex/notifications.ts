import { mutation, query, action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const saveSubscription = mutation({
  args: {
    deviceId: v.string(),
    role: v.string(),
    subscription: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        subscription: args.subscription,
        timestamp: Date.now(),
      });
    } else {
      await ctx.db.insert("pushSubscriptions", {
        deviceId: args.deviceId,
        role: args.role,
        subscription: args.subscription,
        timestamp: Date.now(),
      });
    }
  },
});

export const getSubscriptionsByRole = query({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    if (args.role === "all") {
      return await ctx.db.query("pushSubscriptions").collect();
    }
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
  },
});

export const sendPushNotificationInternal = internalAction({
  args: {
    role: v.string(),
    title: v.string(),
    body: v.string(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runAction((internal as any).pushActions.sendPushNotificationInternal, args);
  },
});

export const sendPushNotification = action({
  args: {
    role: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runAction((internal as any).pushActions.sendPushNotification, args);
  },
});

