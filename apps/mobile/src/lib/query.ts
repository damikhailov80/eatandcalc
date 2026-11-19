import { QueryClient } from '@tanstack/react-query';

/** The app is online-only; the query cache just avoids refetching on every screen focus. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export const queryKeys = {
  me: ['me'] as const,
  invite: ['invite'] as const,
  familyMembers: ['family-members'] as const,
};

/** After joining/leaving/removing the household everything cached belongs to another family. */
export const resetHouseholdData = () => queryClient.invalidateQueries();
