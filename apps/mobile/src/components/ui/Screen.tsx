import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type ScreenProps = {
  title?: string;
  /** Small muted line (e.g. "Воскресенье · сегодня"): above the title, below it with `subtitleBelow`. */
  subtitle?: string;
  subtitleBelow?: boolean;
  /** Right side of the header (buttons). */
  actions?: ReactNode;
  /** Shows a back chevron and a compact (20 pt) title: pushed screens like editors. */
  onBack?: () => void;
  /** Pinned under the scroll view (`StickyFooter`). */
  footer?: ReactNode;
  /** Enables pull-to-refresh (data tabs: `refreshAll`); not for editors, a refresh could clobber the form. */
  onRefresh?: () => Promise<unknown>;
  children?: ReactNode;
};

/** Page shell: warm background, safe area (top only — the tab bar or footer handles the bottom), scrollable body. */
export function Screen({ title, subtitle, subtitleBelow, actions, onBack, footer, onRefresh, children }: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const sub = subtitle ? (
    <Text variant={subtitleBelow ? 'caption' : 'label'} color={colors.textMuted}>
      {subtitle}
    </Text>
  ) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={styles.root} behavior="height">
        {onBack ? (
          <View style={styles.backHeader}>
            <IconButton icon="chevron-left" label="Назад" variant="plain" onPress={onBack} />
            <Text variant="h2" style={styles.backTitle}>{title}</Text>
            {actions}
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }>
          {title && !onBack ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                {subtitleBelow ? null : sub}
                <Text variant="title">{title}</Text>
                {subtitleBelow ? sub : null}
              </View>
              {actions}
            </View>
          ) : null}
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.xs },
  headerText: { flex: 1, gap: 2 },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backTitle: { flex: 1, fontSize: 20, fontFamily: fonts.headingHeavy },
});
