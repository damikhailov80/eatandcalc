import { formatDayTitle, todayISO } from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ListRenderItem } from 'react-native';

import { CookingRow } from '@/components/cooking/CookingRow';
import { Button, Card, ListScreen, SearchField, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { filterCooking, toCookingView, withDayTitles, type CookingListRow, type CookingView } from '@/lib/cooking';
import { queryKeys, refreshAll } from '@/lib/query';
import { productsById } from '@/lib/recipes';
import { colors, spacing } from '@/theme';

const onRowPress = (v: CookingView) => router.push({ pathname: '/cooking/[id]', params: { id: v.session.id } });
const keyExtractor = (row: CookingListRow) => (row.kind === 'day' ? `day-${row.date}` : row.view.session.id);
const Separator = () => <View style={styles.separator} />;

export default function CookingScreen() {
  const sessions = useQuery({ queryKey: queryKeys.cooking, queryFn: api.cookingList });
  // "По рецепту · изменено N" compares with the recipe as the family sees it now.
  const recipes = useQuery({ queryKey: queryKeys.recipes, queryFn: api.recipes });
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const [query, setQuery] = useState('');

  const byId = useMemo(() => productsById(products.data), [products.data]);
  const recipesById = useMemo(() => new Map((recipes.data ?? []).map((r) => [r.id, r])), [recipes.data]);
  const rows = useMemo(
    () =>
      withDayTitles(filterCooking(sessions.data ?? [], query).map((s) => toCookingView(s, recipesById, byId))),
    [sessions.data, query, recipesById, byId],
  );

  const today = todayISO();
  const renderItem = useCallback<ListRenderItem<CookingListRow>>(
    ({ item }) =>
      item.kind === 'day' ? (
        <Text variant="h3" style={styles.day}>{formatDayTitle(item.date, today)}</Text>
      ) : (
        <CookingRow view={item.view} onPress={onRowPress} />
      ),
    [today],
  );

  if (sessions.isPending || recipes.isPending || products.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (sessions.isError || recipes.isError || products.isError) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          if (sessions.isError) sessions.refetch();
          if (recipes.isError) recipes.refetch();
          if (products.isError) products.refetch();
        }}
      />
    );
  }

  const header = (
    <SearchField value={query} onChangeText={setQuery} placeholder="Название готовки" accessibilityLabel="Поиск готовок" />
  );
  const empty = (
    <Card style={styles.empty}>
      <Text variant="h3">{query.trim() ? 'Ничего не нашлось' : 'Готовок пока нет'}</Text>
    </Card>
  );

  return (
    <ListScreen
      title="Готовка"
      actions={<Button title="Новая" onPress={() => router.push('/cooking/start')} style={styles.add} />}
      header={header}
      onRefresh={refreshAll}
      data={rows}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={empty}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  separator: { height: 10 },
  day: { marginTop: spacing.sm },
  empty: { gap: spacing.sm },
  add: { height: 44, paddingHorizontal: spacing.lg },
});
