import { mutation, query, action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import webpush from "web-push";
import { api, internal } from "./_generated/api";

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
    const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.warn("[Push] VAPID keys not configured in server environment. Skipping delivery.");
      return;
    }

    webpush.setVapidDetails(
      "mailto:admin@53ym.cu",
      publicKey,
      privateKey
    );

    const subscriptions = await ctx.runQuery((api as any).notifications.getSubscriptionsByRole, {
      role: args.role,
    });

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({
          title: args.title,
          body: args.body,
          tag: args.tag,
          url: sub.role === 'client' ? '/?view=order_workspace' : `/?view=${sub.role}`
        }));
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log("[Push] Removing expired subscription for device:", sub.deviceId);
          // Mutation to remove would go here
        } else {
          console.error("[Push] Error sending push notification:", err);
        }
      }
    });

    await Promise.allSettled(promises);
  },
});

export const sendPushNotification = action({
  args: {
    role: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runAction((internal as any).notifications.sendPushNotificationInternal, {
      role: args.role,
      title: args.title,
      body: args.body,
    });
  },
});
