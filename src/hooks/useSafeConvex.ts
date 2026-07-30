import { useState, useEffect } from 'react';
import { convex } from '../lib/convexClient';

/**
 * Safe query hook for Convex that handles missing functions or backend errors
 * gracefully without crashing the React application render tree.
 */
export function useSafeQuery<T>(queryFunc: any, args: Record<string, any> = {}): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (!queryFunc) return;
        const result = await convex.query(queryFunc, args);
        if (isMounted) {
          setData(result as T);
        }
      } catch (err: any) {
        // Quietly log warning without throwing unhandled error to React render
        console.warn('[Convex Safe Query Notice]:', err.message || err);
        if (isMounted) {
          setData(undefined);
        }
      }
    };

    fetchData();

    // Poll every 10 seconds for real-time updates safely
    const interval = setInterval(fetchData, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [queryFunc, JSON.stringify(args)]);

  return data;
}

/**
 * Safe mutation wrapper for Convex
 */
export function useSafeMutation(mutationFunc: any) {
  return async (args: Record<string, any>) => {
    try {
      if (!mutationFunc) return null;
      return await convex.mutation(mutationFunc, args);
    } catch (err: any) {
      console.warn('[Convex Safe Mutation Notice]:', err.message || err);
      return null;
    }
  };
}
