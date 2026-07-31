import { useQuery } from 'convex/react';
import { convex } from '../lib/convexClient';

/**
 * Safe query hook for Convex that uses native React reactive subscriptions via useQuery
 * with graceful fallback/skipping when query functions are not defined.
 */
export function useSafeQuery<T>(queryFunc: any, args?: any): T | undefined {
  const result = useQuery(queryFunc ?? "skip", args);
  return result as T | undefined;
}

/**
 * Safe mutation wrapper for Convex
 */
export function useSafeMutation(mutationFunc: any) {
  return async (args: Record<string, any>) => {
    if (!mutationFunc) {
      throw new Error("Mutation function is not defined");
    }
    try {
      return await convex.mutation(mutationFunc, args);
    } catch (err: any) {
      console.error('[Convex Mutation Error]:', err.message || err);
      throw err;
    }
  };
}

