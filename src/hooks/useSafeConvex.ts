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
    let unsubscribe: (() => void) | undefined = undefined;
    let interval: any = undefined;

    const startSync = async () => {
      if (!queryFunc) return;

      try {
        // Try subscribing for real-time reactive updates using watchQuery
        const watcher = (convex as any).watchQuery(queryFunc, args);
        
        const initialVal = watcher.localQueryResult();
        if (initialVal !== undefined && isMounted) {
          setData(initialVal as T);
        }

        unsubscribe = watcher.onUpdate(() => {
          const result = watcher.localQueryResult();
          if (isMounted) {
            setData(result as T);
          }
        });
      } catch (err: any) {
        console.warn('[Convex Safe Subscribe Failed, falling back to polling]:', err.message || err);
        
        // Fallback to manual polling if subscribe is not supported or fails
        const fetchData = async () => {
          try {
            const result = await convex.query(queryFunc, args);
            if (isMounted) {
              setData(result as T);
            }
          } catch (pollErr: any) {
            console.warn('[Convex Safe Poll Error]:', pollErr.message || pollErr);
          }
        };

        fetchData();
        interval = setInterval(fetchData, 5000); // 5-second responsive fallback polling
      }
    };

    startSync();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      if (interval) {
        clearInterval(interval);
      }
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
