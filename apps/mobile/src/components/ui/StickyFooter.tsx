import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

/** Bottom action bar pinned under a scrolling screen ("Сохранить"). */
export function StickyFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
