import { formatDayTitle, todayISO } from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, StyleSheet, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CookingRow } from '@/components/cooking/CookingRow';
import { RecipeRow } from '@/components/recipes/RecipeRow';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  IconButton,
  SearchField,
  SegmentedControl,
  StateMessage,
  StickyFooter,
  Text,
} from '@/components/ui';
import { api } from '@/lib/api';
import { filterCooking, toCookingView, withDayTitles, type CookingListRow, type CookingView } from '@/lib/cooking';
import { filterLabels } from '@/lib/products';
import { queryKeys } from '@/lib/query';
import { filterRecipes, productsById, toRecipeView, type RecipeFilter, type RecipeView } from '@/lib/recipes';
import { colors, fonts, spacing } from '@/theme';

const FILTERS: readonly RecipeFilter[] = ['mine', 'all', 'favorites'];

type Source = 'recipes' | 'cooking';
const SOURCES = [
  { value: 'recipes', label: 'Рецепты' },
  { value: 'cooking', label: 'Готовки' },
] as const;

const keyExtractor = (v: RecipeView) => v.recipe.id;
const cookingKey = (row: CookingListRow) => (row.kind === 'day' ? `day-${row.date}` : row.view.session.id);
const listProps = {
  contentContainerStyle: { padding: spacing.xl },
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: 'on-drag',
  initialNumToRender: 10,
  windowSize: 7,
} as const;
const Separator = () => <View style={styles.separator} />;

/** The editor replaces this screen, so "back" from it returns to the list. */
const startFromRecipe = (v: RecipeView) =>
  router.replace({ pathname: '/cooking/[id]', params: { id: 'new', recipe: v.recipe.id } });
const startFromSession = (v: CookingView) =>
  router.replace({ pathname: '/cooking/[id]', params: { id: 'new', from: v.session.id } });
const startBlank = () => router.replace({ pathname: '/cooking/[id]', params: { id: 'new' } });

/** New cooking: pick the recipe or the past session it starts from (or none). */
export default function CookingStartScreen() {
  const recipes = useQuery({ queryKey: queryKeys.recipes, queryFn: api.recipes });
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const sessions = useQuery({ queryKey: queryKeys.cooking, queryFn: api.cookingList });
  const [source, setSource] = useState<Source>('recipes');
  const [query, setQuery] = useState('');
  const byId = useMemo(() => productsById(products.data), [products.data]);
  const list = recipes.data;
  const mineCount = useMemo(
    () => (list ? filterRecipes(list, byId, { filter: 'mine', query: '' }).length : 0),
    [list, byId],
  );
  const [chosen, setFilter] = useState<RecipeFilter | null>(null);
  const filter = chosen ?? (mineCount > 0 ? 'mine' : 'all');
  // A search looks through all visible recipes.
  const effective = query.trim() ? 'all' : filter;
  const visible = useMemo(
    () =>
      list
        ? filterRecipes(list, byId, { filter: effective, query })
            .filter((r) => !r.hidden)
            .map((r) => toRecipeView(r, byId))
        : [],
    [list, byId, effective, query],
  );
  const renderItem = useCallback<ListRenderItem<RecipeView>>(
    ({ item }) => <RecipeRow view={item} onPress={startFromRecipe} />,
    [],
  );

  const recipesById = useMemo(() => new Map((list ?? []).map((r) => [r.id, r])), [list]);
  const cookingRows = useMemo(
    () =>
      source === 'cooking'
        ? withDayTitles(filterCooking(sessions.data ?? [], query).map((s) => toCookingView(s, recipesById, byId)))
        : [],
    [source, sessions.data, query, recipesById, byId],
  );
  const today = todayISO();
  const renderCooking = useCallback<ListRenderItem<CookingListRow>>(
    ({ item }) =>
      item.kind === 'day' ? (
        <Text variant="h3" style={styles.day}>{formatDayTitle(item.date, today)}</Text>
      ) : (
        <CookingRow view={item.view} onPress={startFromSession} />
      ),
    [today],
  );

  if (recipes.isPending || products.isPending || (source === 'cooking' && sessions.isPending)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (recipes.isError || products.isError || (source === 'cooking' && sessions.isError)) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          if (recipes.isError) recipes.refetch();
          if (products.isError) products.refetch();
          if (sessions.isError) sessions.refetch();
        }}
      />
    );
  }

  const empty = (
    <Card>
      <Text variant="h3">{query.trim() || source === 'recipes' ? 'Ничего не нашлось' : 'Готовок пока нет'}</Text>
    </Card>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={styles.root} behavior="height">
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Назад" variant="plain" onPress={() => router.back()} />
          <Text variant="h2" style={styles.title}>Новая готовка</Text>
        </View>
        <SegmentedControl
          options={SOURCES}
          value={source}
          onChange={setSource}
          accessibilityLabel="Основа готовки"
          style={styles.sources}
        />
        {source === 'recipes' ? (
          <FlatList
            data={visible}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={Separator}
            ListHeaderComponent={
              <>
                <SearchField value={query} onChangeText={setQuery} placeholder="Рецепт или продукт" />
                {query.trim() ? null : (
                  <ChipRow>
                    {FILTERS.map((f) => (
                      <Chip key={f} label={filterLabels[f]} selected={f === filter} onPress={() => setFilter(f)} />
                    ))}
                  </ChipRow>
                )}
              </>
            }
            ListHeaderComponentStyle={styles.listHeader}
            ListEmptyComponent={empty}
            {...listProps}
          />
        ) : (
          <FlatList
            data={cookingRows}
            keyExtractor={cookingKey}
            renderItem={renderCooking}
            ItemSeparatorComponent={Separator}
            ListHeaderComponent={
              <SearchField value={query} onChangeText={setQuery} placeholder="Название готовки" />
            }
            ListHeaderComponentStyle={styles.listHeader}
            ListEmptyComponent={empty}
            {...listProps}
          />
        )}
        <StickyFooter>
          <Button title="Без рецепта" variant="soft" large onPress={startBlank} />
        </StickyFooter>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  title: { flex: 1, fontSize: 20, fontFamily: fonts.headingHeavy },
  sources: { marginTop: spacing.md, marginHorizontal: spacing.xl },
  day: { marginTop: spacing.sm },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
  separator: { height: 10 },
});
