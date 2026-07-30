import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("dependent"),
      v.literal("kitchen")
    ),
    deviceId: v.string(),
    isActive: v.boolean(),
    loginTime: v.number(),
  }).index("by_deviceId", ["deviceId"]),

  orders: defineTable({
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
    status: v.union(
      v.literal("pending_dependent"),
      v.literal("in_kitchen"),
      v.literal("ready_to_serve"),
      v.literal("paid")
    ),
    timestamp: v.number(),
    assignedDependentId: v.string(),
  }).index("by_status", ["status"]),

  reservations: defineTable({
    customerName: v.string(),
    date: v.string(),
    timeSlot: v.string(),
    area: v.string(),
    guests: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
  }),

  menuItems: defineTable({
    name: v.string(),
    category: v.string(),
    priceCUP: v.number(),
    priceUSD: v.number(),
    isAvailable: v.boolean(),
    image: v.optional(v.string()),
  }),

  bitacora: defineTable({
    action: v.string(),
    userRole: v.string(),
    username: v.string(),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
});
