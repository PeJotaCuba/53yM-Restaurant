import { ConvexReactClient } from "convex/react";

const envUrl = import.meta.env.VITE_CONVEX_URL;
const isValidUrl = Boolean(
  envUrl && 
  envUrl.startsWith("http") && 
  !envUrl.includes("placeholder-convex") && 
  !envUrl.includes("content-starfish-744")
);
const convexUrl = isValidUrl ? (envUrl as string) : "https://ceaseless-dotterel-79.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);

