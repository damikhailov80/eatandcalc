import type { ReactNode } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, type FlatListProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';
import { ScreenHeader, useRefreshControl } from './Screen';

export type ListScreenProps<T> = Pick<
  FlatListProps<T>,
  'data' | 'renderItem' | 'keyExtractor' | 'ListEmptyComponent' | 'extraData'
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
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={styles.root} behavior="height">
        <FlatList
          {...list}
          ListHeaderComponent={
            <>
              <ScreenHeader title={title} actions={actions} />
              {header}
            </>
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
  header: { gap: spacing.md, marginBottom: spacing.md },
});
