import { formatDayTitle, RESTAURANTS, restaurantLabels, todayISO, type ProductDto, type Restaurant } from '@eatandcalc/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, StyleSheet, View, type ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CookingRow } from '@/components/cooking/CookingRow';
import { ProductRow } from '@/components/products/ProductRow';
import { RecipeRow } from '@/components/recipes/RecipeRow';
import { Card, Chip, ChipRow, IconButton, SearchField, SegmentedControl, StateMessage, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { filterCooking, toCookingView, withDayTitles, type CookingListRow, type CookingView } from '@/lib/cooking';
import { MEAL_TITLES, type MealType } from '@/lib/day';
import { filterLabels, filterProducts, type ProductFilter } from '@/lib/products';
import { queryKeys } from '@/lib/query';
import { filterRecipes, productsById, toRecipeView, type RecipeFilter, type RecipeView } from '@/lib/recipes';
import { colors, fonts, spacing } from '@/theme';

type Params = { date: string; type: MealType; meal?: string };

type Source = 'cooking' | 'recipes' | 'products' | 'fastfood';
const SOURCES = [
  { value: 'cooking', label: 'Готовки' },
  { value: 'recipes', label: 'Рецепты' },
  { value: 'products', label: 'Продукты' },
  { value: 'fastfood', label: 'Фастфуд' },
] as const;
/** Sources listed from the products query. */
const isProductSource = (s: Source): s is 'products' | 'fastfood' => s === 'products' || s === 'fastfood';
/** «Избранное» / «Все» chips, the same for recipes and products. */
const FILTERS = ['favorites', 'all'] as const satisfies readonly (RecipeFilter & ProductFilter)[];
type FavoritesOrAll = (typeof FILTERS)[number];

const cookingKey = (row: CookingListRow) => (row.kind === 'day' ? `day-${row.date}` : row.view.session.id);
const recipeKey = (v: RecipeView) => v.recipe.id;
const productKey = (p: ProductDto) => p.id;
const Separator = () => <View style={styles.separator} />;
const listProps = {
  contentContainerStyle: { padding: spacing.xl },
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: 'on-drag',
  initialNumToRender: 10,
  windowSize: 7,
} as const;

/**
 * "+ Блюдо": what goes into the meal — a cooking session (weighed pot), a recipe (its KBJU per 100 g, e.g. coffee
 * with sugar), a product or a fast-food dish (a product with a chain). Then the split screen replaces this one,
 * so "back" returns to the day.
 */
export default function AddDishScreen() {
  const { date, type, meal = '' } = useLocalSearchParams<Params>();
  const sessions = useQuery({ queryKey: queryKeys.cooking, queryFn: api.cookingList });
  const recipes = useQuery({ queryKey: queryKeys.recipes, queryFn: api.recipes });
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const [source, setSource] = useState<Source>('cooking');
  const [query, setQuery] = useState('');
  const [chosen, setFilter] = useState<FavoritesOrAll | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const byId = useMemo(() => productsById(products.data), [products.data]);
  const recipesById = useMemo(() => new Map((recipes.data ?? []).map((r) => [r.id, r])), [recipes.data]);

  const cookingRows = useMemo(
    () => withDayTitles(filterCooking(sessions.data ?? [], query).map((s) => toCookingView(s, recipesById, byId))),
    [sessions.data, query, recipesById, byId],
  );

  // «Избранное» first when there is anything in it; a search looks through everything.
  const favoritesCount = useMemo(() => {
    if (source === 'recipes') return filterRecipes(recipes.data ?? [], byId, { filter: 'favorites', query: '' }).length;
    if (isProductSource(source))
      return filterProducts(products.data ?? [], { kind: source, filter: 'favorites', query: '' }).length;
    return 0;
  }, [source, recipes.data, products.data, byId]);
  const filter: FavoritesOrAll = query.trim() ? 'all' : (chosen ?? (favoritesCount > 0 ? 'favorites' : 'all'));

  const recipeViews = useMemo(
    () =>
      source === 'recipes'
        ? filterRecipes(recipes.data ?? [], byId, { filter, query })
            .filter((r) => !r.hidden)
            .map((r) => toRecipeView(r, byId))
        : [],
    [source, recipes.data, byId, filter, query],
  );
  const productList = useMemo(
    () =>
      isProductSource(source)
        ? filterProducts(products.data ?? [], {
            kind: source,
            filter,
            restaurant: source === 'fastfood' ? restaurant : null,
            query,
          })
        : [],
    [source, products.data, filter, restaurant, query],
  );

  const pickSession = useCallback(
    (v: CookingView) => router.replace({ pathname: '/day/dish', params: { date, type, meal, session: v.session.id } }),
    [date, type, meal],
  );
  const pickRecipe = useCallback(
    (v: RecipeView) => router.replace({ pathname: '/day/dish', params: { date, type, meal, recipe: v.recipe.id } }),
    [date, type, meal],
  );
  const pickProduct = useCallback(
    (p: ProductDto) => router.replace({ pathname: '/day/dish', params: { date, type, meal, product: p.id } }),
    [date, type, meal],
  );

  const today = todayISO();
  const renderCooking = useCallback<ListRenderItem<CookingListRow>>(
    ({ item }) =>
      item.kind === 'day' ? (
        <Text variant="h3" style={styles.day}>{formatDayTitle(item.date, today)}</Text>
      ) : (
        <CookingRow view={item.view} onPress={pickSession} />
      ),
    [today, pickSession],
  );
  const renderRecipe = useCallback<ListRenderItem<RecipeView>>(
    ({ item }) => <RecipeRow view={item} onPress={pickRecipe} />,
    [pickRecipe],
  );
  const lastProduct = productList.length - 1;
  const renderProduct = useCallback<ListRenderItem<ProductDto>>(
    ({ item, index }) => (
      <ProductRow product={item} first={index === 0} last={index === lastProduct} onPress={pickProduct} />
    ),
    [lastProduct, pickProduct],
  );

  const changeSource = (next: Source) => {
    setSource(next);
    setQuery('');
    setFilter(null);
    setRestaurant(null);
  };

  const placeholder = {
    cooking: 'Название готовки',
    recipes: 'Рецепт или продукт',
    products: 'Поиск продукта',
    fastfood: 'Поиск блюда',
  }[source];
  const header = (
    <>
      <SearchField value={query} onChangeText={setQuery} placeholder={placeholder} />
      {source === 'cooking' || query.trim() ? null : (
        <ChipRow>
          {FILTERS.map((f) => (
            <Chip key={f} label={filterLabels[f]} selected={f === filter} onPress={() => setFilter(f)} />
          ))}
        </ChipRow>
      )}
      {source === 'fastfood' ? (
        <ChipRow>
          {RESTAURANTS.map((r) => (
            <Chip
              key={r}
              label={restaurantLabels[r]}
              selected={r === restaurant}
              onPress={() => setRestaurant(r === restaurant ? null : r)}
            />
          ))}
        </ChipRow>
      ) : null}
    </>
  );
  const empty = (
    <Card>
      <Text variant="h3">{query.trim() || source !== 'cooking' ? 'Ничего не нашлось' : 'Готовок пока нет'}</Text>
    </Card>
  );

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
  } else if (source === 'cooking') {
    body = (
      <FlatList
        data={cookingRows}
        keyExtractor={cookingKey}
        renderItem={renderCooking}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={empty}
        {...listProps}
      />
    );
  } else if (source === 'recipes') {
    body = (
      <FlatList
        data={recipeViews}
        keyExtractor={recipeKey}
        renderItem={renderRecipe}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={empty}
        {...listProps}
      />
    );
  } else {
    body = (
      <FlatList
        data={productList}
        keyExtractor={productKey}
        renderItem={renderProduct}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={styles.listHeader}
        ListEmptyComponent={empty}
        {...listProps}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.root} behavior="height">
        <View style={styles.header}>
          <IconButton icon="chevron-left" label="Назад" variant="plain" onPress={() => router.back()} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{`В «${MEAL_TITLES[type] ?? 'приём пищи'}»`}</Text>
            <Text variant="caption">{formatDayTitle(date, today)}</Text>
          </View>
        </View>
        <SegmentedControl
          options={SOURCES}
          value={source}
          onChange={changeSource}
          accessibilityLabel="Что добавить"
          style={styles.sources}
        />
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
  sources: { marginTop: spacing.md, marginHorizontal: spacing.xl },
  day: { marginTop: spacing.sm },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
  separator: { height: 10 },
});
