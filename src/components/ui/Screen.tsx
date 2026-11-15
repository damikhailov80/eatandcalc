import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';
import { Text } from './Text';

export type ScreenProps = {
  title?: string;
  /** Small muted line above the title (e.g. "Воскресенье · сегодня"). */
  subtitle?: string;
  /** Right side of the header (buttons). */
  actions?: ReactNode;
  children?: ReactNode;
};

/** Page shell: warm background, safe area (top only — the tab bar handles the bottom), scrollable body. */
export function Screen({ title, subtitle, actions, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {title ? (
          <View style={styles.header}>
            <View style={styles.headerText}>
              {subtitle ? <Text variant="label" color={colors.textMuted}>{subtitle}</Text> : null}
              <Text variant="title">{title}</Text>
            </View>
            {actions}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.xs },
  headerText: { flex: 1, gap: 2 },
});
