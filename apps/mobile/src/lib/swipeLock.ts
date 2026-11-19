import { createContext, use, useMemo } from 'react';
import type { ViewProps } from 'react-native';

/**
 * Lets an area inside a tab (a list's header with search and chip rows) switch off swiping between
 * tabs while a finger is on it, so horizontal swipes there scroll the chips instead of changing the
 * tab. Outside the tabs it does nothing.
 */
export const SwipeLockContext = createContext<(locked: boolean) => void>(() => {});

/** Touch handlers for a View that is a no-swipe zone. */
export function useSwipeLockZone(): Pick<ViewProps, 'onTouchStart' | 'onTouchEnd' | 'onTouchCancel'> {
  const lock = use(SwipeLockContext);
  return useMemo(
    () => ({
      onTouchStart: () => lock(true),
      onTouchEnd: () => lock(false),
      onTouchCancel: () => lock(false),
    }),
    [lock],
  );
}
