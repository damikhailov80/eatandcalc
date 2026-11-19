import type { ReactNode } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, View, type FlatListProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSwipeLockZone } from '@/lib/swipeLock';
import { colors, spacing } from '@/theme';
import { ScreenHeader, useRefreshControl } from './Screen';

export type ListScreenProps<T> = Pick<
  FlatListProps<T>,
  'data' | 'renderItem' | 'keyExtractor' | 'ListEmptyComponent' | 'extraData' | 'ItemSeparatorComponent'
> & {
  title: string;
  actions?: ReactNode;
  /** Above the list, scrolls with it (search, filter chips). */
  header?: ReactNode;
  onRefresh?: () => Promise<unknown>;
};

/**
 * Tab page for long lists: like `Screen`, but the body is a virtualized FlatList,
 * so only rows near the viewport are rendered (hundreds of products).
 */
export function ListScreen<T>({ title, actions, header, onRefresh, ...list }: ListScreenProps<T>) {
  const refreshControl = useRefreshControl(onRefresh);
  // The whole header (title, search, chip rows) is a no-swipe zone between tabs.
  const swipeLockZone = useSwipeLockZone();
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={styles.root} behavior="height">
        <FlatList
          {...list}
          ListHeaderComponent={
            <View style={styles.headerInner} {...swipeLockZone}>
              <ScreenHeader title={title} actions={actions} />
              {header}
            </View>
          }
          ListHeaderComponentStyle={styles.header}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={refreshControl}
          initialNumToRender={14}
          maxToRenderPerBatch={20}
          windowSize={7}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  header: { marginBottom: spacing.md },
  headerInner: { gap: spacing.md },
});
