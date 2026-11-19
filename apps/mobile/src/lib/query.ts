import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import { diag } from './diagnostics';

/**
 * The app is online-only; the query cache just avoids refetching on every screen focus.
 * Changes from other devices arrive through `useHouseholdSync` (`lib/sync.ts`).
 */
export const queryClient = new QueryClient({
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
};

/** After joining/leaving/removing the household everything cached belongs to another family. */
export const resetHouseholdData = () => queryClient.invalidateQueries();

/** Pull-to-refresh: refetch everything on screen (and the sync marker, so it doesn't refetch again). */
export async function refreshAll() {
  const keys = queryClient
    .getQueryCache()
    .findAll({ type: 'active' })
    .map((q) => q.queryKey.join('/'));
  diag('sync', `обновление свайпом: ${keys.join(', ') || 'нет запросов на экране'}`);
  await queryClient.refetchQueries({ type: 'active' });
}
