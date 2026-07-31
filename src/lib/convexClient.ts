import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set. A valid Convex deployment URL is required.");
}

export const convex = new ConvexReactClient(convexUrl);


