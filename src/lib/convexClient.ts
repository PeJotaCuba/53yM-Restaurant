import { ConvexReactClient } from "convex/react";

const envUrl = import.meta.env.VITE_CONVEX_URL;
const isValidUrl = Boolean(envUrl && envUrl.startsWith("http") && !envUrl.includes("placeholder-convex"));
const convexUrl = isValidUrl ? (envUrl as string) : "https://different-butterfly-989.eu-west-1.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);

