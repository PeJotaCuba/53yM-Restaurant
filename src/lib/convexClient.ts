import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://placeholder-convex.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);
