import { ConvexReactClient } from "convex/react";

const envUrl = import.meta.env.VITE_CONVEX_URL;
const isValidUrl = Boolean(envUrl && envUrl.startsWith("http") && !envUrl.includes("placeholder-convex"));
const convexUrl = isValidUrl ? (envUrl as string) : "https://hip-duck-344.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);

