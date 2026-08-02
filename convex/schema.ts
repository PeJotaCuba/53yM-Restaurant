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
    // Optional synchronized fields for dependents, managers, and admin authorized IDs
    password: v.optional(v.string()),
    phone: v.optional(v.string()),
    tableNumber: v.optional(v.string()),
    authorizedAdminIds: v.optional(v.array(v.string())),
  }).index("by_deviceId", ["deviceId"]),

  orders: defineTable({
    id: v.optional(v.string()),
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
    status: v.string(),
    timestamp: v.number(),
    assignedDependentId: v.string(),
    reservationId: v.optional(v.string()),
    customerName: v.optional(v.string()),
    comandaId: v.optional(v.string()),
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
      v.literal("paid"),
      v.literal("cancelled"),
      v.literal("cancellation_pending")
    ),
    createdAt: v.number(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    occasion: v.optional(v.string()),
    dishReference: v.optional(v.string()),
    tableNumber: v.optional(v.string()),
    dishes: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          priceCUP: v.optional(v.number()),
        })
      )
    ),
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

  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  history: defineTable({
    jornadaId: v.string(),
    dateStr: v.string(),
    year: v.number(),
    month: v.number(),
    day: v.number(),
    orders: v.array(v.any()),
    reservations: v.array(v.any()),
    orderReports: v.array(v.any()),
    kitchenReports: v.array(v.any()),
    cashRegisterCloses: v.array(v.any()),
    comandas: v.optional(v.array(v.any())),
    bitacora: v.array(v.any()),
    timestamp: v.number(),
  }).index("by_date", ["year", "month", "day"]),

  snapshots: defineTable({
    data: v.any(),
    timestamp: v.number(),
    createdBy: v.string(),
    label: v.string(),
  }).index("by_timestamp", ["timestamp"]),

  pushSubscriptions: defineTable({
    deviceId: v.string(),
    role: v.string(),
    subscription: v.any(), // Store the JSON subscription object
    timestamp: v.number(),
  }).index("by_deviceId", ["deviceId"])
    .index("by_role", ["role"]),
});
