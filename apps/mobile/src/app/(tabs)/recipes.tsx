import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, type ListRenderItem } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { RecipeRow, type RecipeRowAction } from '@/components/recipes/RecipeRow';
import { Button, Card, Chip, ChipRow, ListScreen, SearchField, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { filterLabels } from '@/lib/products';
import { queryClient, queryKeys, refreshAll } from '@/lib/query';
import {
  filterRecipes,
  productsById,
  toRecipeView,
  useRecipeFlags,
  type RecipeFilter,
  type RecipeView,
} from '@/lib/recipes';
import { colors, spacing } from '@/theme';

const FILTERS: readonly RecipeFilter[] = ['mine', 'all', 'favorites', 'own', 'modified', 'hidden'];

const emptyText: Partial<Record<RecipeFilter, string>> = {
  mine: 'Здесь будут избранные и добавленные',
  own: 'Добавленных рецептов нет',
  favorites: 'Избранных нет',
  modified: 'Изменённых рецептов нет',
  hidden: 'Скрытых нет',
};

const openRecipe = (id: string, name?: string) =>
  router.push({ pathname: '/recipe/[id]', params: name ? { id, name } : { id } });
const onRowPress = (v: RecipeView) => openRecipe(v.recipe.id);

const keyExtractor = (v: RecipeView) => v.recipe.id;
const Separator = () => <View style={styles.separator} />;

export default function RecipesScreen() {
  const recipes = useQuery({ queryKey: queryKeys.recipes, queryFn: api.recipes });
  // Weight and KBJU come from the products as the family sees them now.
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const [query, setQuery] = useState('');
  const [chosenFilter, setFilter] = useState<RecipeFilter | null>(null);

  const reset = useMutation({
    mutationFn: api.resetRecipe,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.recipes }),
    onError: (e) => Alert.alert('Не получилось', familyErrorMessage(e)),
  });
  const { mutate: resetMutate } = reset;
  const resetAction = useMemo<RecipeRowAction>(
    () => ({
      icon: 'restore',
      label: 'Вернуть стандартный',
      onPress: ({ recipe }) =>
        Alert.alert(`Вернуть стандартный рецепт «${recipe.name}»?`, undefined, [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Вернуть', style: 'destructive', onPress: () => resetMutate(recipe.id) },
        ]),
    }),
    [resetMutate],
  );

  const { toggleFavorite, setHidden } = useRecipeFlags();
  const restoreAction = useMemo<RecipeRowAction>(
    () => ({ icon: 'eye-outline', label: 'Вернуть', onPress: ({ recipe }) => setHidden(recipe, false) }),
    [setHidden],
  );
  const onToggleFavorite = useCallback((v: RecipeView) => toggleFavorite(v.recipe), [toggleFavorite]);

  const byId = useMemo(() => productsById(products.data), [products.data]);
  const list = recipes.data;
  const mineCount = useMemo(
    () => (list ? filterRecipes(list, byId, { filter: 'mine', query: '' }).length : 0),
    [list, byId],
  );
  // "Свои" is the quick list; while it's empty start with all recipes.
  const filter = chosenFilter ?? (mineCount > 0 ? 'mine' : 'all');
  // Pin the starting filter once loaded, so the first ♥ doesn't switch the list under the finger.
  if (list && chosenFilter == null) setFilter(filter);

  const visible = useMemo(
    () => (list ? filterRecipes(list, byId, { filter, query }).map((r) => toRecipeView(r, byId)) : []),
    [list, byId, filter, query],
  );

  const action = filter === 'modified' ? resetAction : filter === 'hidden' ? restoreAction : undefined;
  const renderItem = useCallback<ListRenderItem<RecipeView>>(
    ({ item }) => <RecipeRow view={item} onPress={onRowPress} onToggleFavorite={onToggleFavorite} action={action} />,
    [onToggleFavorite, action],
  );

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

  const trimmed = query.trim();
  const empty = (
    <Card style={styles.empty}>
      <Text variant="h3">{trimmed ? 'Ничего не нашлось' : (emptyText[filter] ?? 'Нет рецептов')}</Text>
      {trimmed ? <Button variant="ghost" title={`Добавить «${trimmed}»`} onPress={() => openRecipe('new', trimmed)} /> : null}
    </Card>
  );

  return (
    <ListScreen
      title="Рецепты"
      actions={<Button title="Добавить" onPress={() => openRecipe('new')} style={styles.add} />}
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
  empty: { gap: spacing.sm },
  add: { height: 44, paddingHorizontal: spacing.lg },
});
