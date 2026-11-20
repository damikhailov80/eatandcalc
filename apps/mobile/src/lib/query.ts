import { focusManager, MutationCache, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import { diag } from './diagnostics';
import { haptics } from './haptics';

/**
 * The app is online-only; the query cache just avoids refetching on every screen focus.
 * Changes from other devices arrive through `useHouseholdSync` (`lib/sync.ts`).
 */
export const queryClient = new QueryClient({
  // Every change the server accepted (or refused) gets a short haptic; `meta: { haptic: false }` opts out
  // (toggles tap on press instead).
  mutationCache: new MutationCache({
    onSuccess: (_data, _vars, _ctx, mutation) => {
      if (mutation.meta?.haptic !== false) haptics.success();
    },
    onError: (_error, _vars, _ctx, mutation) => {
      if (mutation.meta?.haptic !== false) haptics.error();
    },
  }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// React Native has no window focus/online events: wire them to AppState and expo-network, so stale
// queries refetch when the app comes back to the foreground or the network returns, and polling
// pauses in the background.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});
onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((state) => setOnline(state.isConnected !== false));
  return () => sub.remove();
});

export const queryKeys = {
  me: ['me'] as const,
  sync: ['sync'] as const,
  invite: ['invite'] as const,
  familyMembers: ['family-members'] as const,
  products: ['products'] as const,
  recipes: ['recipes'] as const,
  cooking: ['cooking'] as const,
  /** All meals queries (prefix for invalidation). */
  meals: ['meals'] as const,
  /** Meals of the week starting on `monday`. */
  mealsWeek: (monday: string) => ['meals', monday] as const,
  /** Meals of the 6-week calendar grid starting on `monday`. */
  mealsGrid: (monday: string) => ['meals', 'grid', monday] as const,
  /** Meals from `from` up to today (history month chart). */
  mealsRange: (from: string, to: string) => ['meals', 'range', from, to] as const,
};

/**
 * After joining/leaving/removing the household everything cached belongs to another family. The invite is
 * dropped, not refetched: it is owner-only, and the owner's invite block may still be mounted for a moment
 * after the joiner became a member (refetching it then fails with OWNER_ONLY).
 */
export function resetHouseholdData() {
  queryClient.removeQueries({ queryKey: queryKeys.invite });
  return queryClient.invalidateQueries();
}

/** Pull-to-refresh: refetch everything on screen (and the sync marker, so it doesn't refetch again). */
export async function refreshAll() {
  const keys = queryClient
    .getQueryCache()
    .findAll({ type: 'active' })
    .map((q) => q.queryKey.join('/'));
  diag('sync', `обновление свайпом: ${keys.join(', ') || 'нет запросов на экране'}`);
  await queryClient.refetchQueries({ type: 'active' });
}
