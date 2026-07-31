import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://placeholder.convex.cloud";

if (!import.meta.env.VITE_CONVEX_URL) {
  console.error("VITE_CONVEX_URL is not defined in your environment variables. Convex features will be disabled.");
}

export const convex = new ConvexReactClient(convexUrl);

