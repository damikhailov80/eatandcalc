import { QueryClient } from '@tanstack/react-query';

/** The app is online-only; the query cache just avoids refetching on every screen focus. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export const queryKeys = {
  me: ['me'] as const,
};
