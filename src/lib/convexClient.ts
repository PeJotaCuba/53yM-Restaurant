import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://content-starfish-744.convex.cloud";

if (!import.meta.env.VITE_CONVEX_URL) {
  console.warn("VITE_CONVEX_URL not explicitly set, falling back to production deployment URL.");
}

export const convex = new ConvexReactClient(convexUrl);


