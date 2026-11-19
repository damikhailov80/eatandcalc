import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ListRenderItem } from 'react-native';

import { RecipeRow } from '@/components/recipes/RecipeRow';
import { Card, Chip, ChipRow, ListScreen, SearchField, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { filterLabels } from '@/lib/products';
import { queryKeys, refreshAll } from '@/lib/query';
import { filterRecipes, productsById, toRecipeView, type RecipeFilter, type RecipeView } from '@/lib/recipes';
import { colors } from '@/theme';

const FILTERS: readonly RecipeFilter[] = ['mine', 'all'];

const emptyText: Partial<Record<RecipeFilter, string>> = {
  mine: 'Здесь будут избранные и добавленные',
};

const keyExtractor = (v: RecipeView) => v.recipe.id;
const Separator = () => <View style={styles.separator} />;

export default function RecipesScreen() {
  const recipes = useQuery({ queryKey: queryKeys.recipes, queryFn: api.recipes });
  // Weight and KBJU come from the products as the family sees them now.
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const [query, setQuery] = useState('');
  const [chosenFilter, setFilter] = useState<RecipeFilter | null>(null);

  const byId = useMemo(() => productsById(products.data), [products.data]);
  const list = recipes.data;
  const mineCount = useMemo(
    () => (list ? filterRecipes(list, byId, { filter: 'mine', query: '' }).length : 0),
    [list, byId],
  );
  // "Свои" is the quick list; while it's empty start with all recipes.
  const filter = chosenFilter ?? (mineCount > 0 ? 'mine' : 'all');
  if (list && chosenFilter == null) setFilter(filter);

  const visible = useMemo(
    () => (list ? filterRecipes(list, byId, { filter, query }).map((r) => toRecipeView(r, byId)) : []),
    [list, byId, filter, query],
  );

  const renderItem = useCallback<ListRenderItem<RecipeView>>(({ item }) => <RecipeRow view={item} />, []);

  if (recipes.isPending || products.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (recipes.isError || products.isError) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          if (recipes.isError) recipes.refetch();
          if (products.isError) products.refetch();
        }}
      />
    );
  }

  const header = (
    <>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Название или продукт"
        accessibilityLabel="Поиск рецептов"
      />
      <ChipRow>
        {FILTERS.map((f) => (
          <Chip key={f} label={filterLabels[f]} selected={f === filter} onPress={() => setFilter(f)} />
        ))}
      </ChipRow>
    </>
  );

  const empty = (
    <Card>
      <Text variant="h3">{query.trim() ? 'Ничего не нашлось' : (emptyText[filter] ?? 'Нет рецептов')}</Text>
    </Card>
  );

  return (
    <ListScreen
      title="Рецепты"
      header={header}
      onRefresh={refreshAll}
      data={visible}
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
});
