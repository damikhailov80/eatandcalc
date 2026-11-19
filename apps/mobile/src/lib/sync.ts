import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { api } from './api';
import { queryClient, queryKeys } from './query';

const POLL_MS = 15_000;

/**
 * Keeps data in step with other devices of the household: polls a tiny `/api/sync` marker
 * (household id + revision, bumped by every write) while the app is in the foreground and,
 * when it changes, invalidates every query (on-screen ones refetch now, the rest on next mount).
 * Mount once in the signed-in area.
 */
export function useHouseholdSync() {
  const { data } = useQuery({
    queryKey: queryKeys.sync,
    queryFn: api.sync,
    refetchInterval: POLL_MS,
    staleTime: 0,
  });

  const marker = data ? `${data.householdId}:${data.revision}` : null;
  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!marker) return;
    if (seen.current !== null && seen.current !== marker) {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.sync[0] });
    }
    seen.current = marker;
  }, [marker]);
}
