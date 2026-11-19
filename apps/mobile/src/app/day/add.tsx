import { formatDayTitle, todayISO } from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, StyleSheet, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CookingRow } from '@/components/cooking/CookingRow';
import { Card, IconButton, SearchField, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { filterCooking, toCookingView, withDayTitles, type CookingListRow, type CookingView } from '@/lib/cooking';
import { MEAL_TITLES, type MealType } from '@/lib/day';
import { queryKeys } from '@/lib/query';
import { productsById } from '@/lib/recipes';
import { colors, fonts, spacing } from '@/theme';

type Params = { date: string; type: MealType; meal?: string };

const cookingKey = (row: CookingListRow) => (row.kind === 'day' ? `day-${row.date}` : row.view.session.id);
const Separator = () => <View style={styles.separator} />;

/** "+ Блюдо": pick what goes into the meal (a cooking session for now), then distribute it. */
export default function AddDishScreen() {
  const { date, type, meal } = useLocalSearchParams<Params>();
  const sessions = useQuery({ queryKey: queryKeys.cooking, queryFn: api.cookingList });
  const recipes = useQuery({ queryKey: queryKeys.recipes, queryFn: api.recipes });
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const [query, setQuery] = useState('');

  const byId = useMemo(() => productsById(products.data), [products.data]);
  const recipesById = useMemo(() => new Map((recipes.data ?? []).map((r) => [r.id, r])), [recipes.data]);
  const rows = useMemo(
    () => withDayTitles(filterCooking(sessions.data ?? [], query).map((s) => toCookingView(s, recipesById, byId))),
    [sessions.data, query, recipesById, byId],
  );

  // The distribution screen replaces this one, so "back" from it returns to the day.
  const pick = useCallback(
    (v: CookingView) =>
      router.replace({ pathname: '/day/dish', params: { date, type, meal: meal ?? '', session: v.session.id } }),
    [date, type, meal],
  );
  const today = todayISO();
  const renderItem = useCallback<ListRenderItem<CookingListRow>>(
    ({ item }) =>
      item.kind === 'day' ? (
        <Text variant="h3" style={styles.day}>{formatDayTitle(item.date, today)}</Text>
      ) : (
        <CookingRow view={item.view} onPress={pick} />
      ),
    [today, pick],
  );

  const title = `В «${MEAL_TITLES[type] ?? 'приём пищи'}»`;
  let body;
  if (sessions.isPending || recipes.isPending || products.isPending) {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (sessions.isError || recipes.isError || products.isError) {
    body = (
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
  } else {
    body = (
      <FlatList
        data={rows}
        keyExtractor={cookingKey}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={<SearchField value={query} onChangeText={setQuery} placeholder="Название готовки" />}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={
          <Card>
            <Text variant="h3">{query.trim() ? 'Ничего не нашлось' : 'Готовок пока нет'}</Text>
          </Card>
        }
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        windowSize={7}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.root} behavior="height">
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Назад" variant="plain" onPress={() => router.back()} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text variant="caption">{formatDayTitle(date, today)}</Text>
          </View>
        </View>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontFamily: fonts.headingHeavy },
  list: { padding: spacing.xl },
  day: { marginTop: spacing.sm },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
  separator: { height: 10 },
});
