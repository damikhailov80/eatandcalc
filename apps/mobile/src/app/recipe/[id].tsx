import type { ProductDto, RecipeData, RecipeDto } from '@eatandcalc/shared';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { familyErrorMessage } from '@/components/family/errors';
import { ProductPicker } from '@/components/recipes/ProductPicker';
import { blankDraft, fromDraft, newIngredient, RecipeForm, toDraft, type RecipeDraft } from '@/components/recipes/RecipeForm';
import { Button, Card, IconButton, Screen, StateMessage, StickyFooter, Text } from '@/components/ui';
import { api } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';
import { ingredientsLine, productsById, useRecipeFlags } from '@/lib/recipes';
import { colors, fonts, radii, spacing } from '@/theme';

const NEW = 'new';

const recipeData = (r: RecipeDto): RecipeData => ({ name: r.name, items: r.items });

function Editor({
  recipe,
  initial,
  products,
}: {
  recipe: RecipeDto | null;
  initial: RecipeDraft;
  products: readonly ProductDto[];
}) {
  const [value, setValue] = useState(initial);
  const [picking, setPicking] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const byId = useMemo(() => productsById(products), [products]);
  const data = fromDraft(value, byId);

  const done = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
    router.back();
  };
  const onError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));

  const save = useMutation({
    mutationFn: (input: RecipeData) => (recipe ? api.updateRecipe(recipe.id, input) : api.createRecipe(input)),
    onSuccess: done,
    onError,
  });
  // No `recipe!.x` in closures: React Compiler reads such member paths during render as memo deps.
  const recipeId = recipe?.id;
  const recipeName = recipe?.name;
  const reset = useMutation({ mutationFn: () => api.resetRecipe(recipeId ?? ''), onSuccess: done, onError });
  const confirmReset = () =>
    Alert.alert('Вернуть стандартный рецепт?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Вернуть', style: 'destructive', onPress: () => reset.mutate() },
    ]);

  const remove = useMutation({
    mutationFn: () => api.deleteRecipe(recipeId ?? ''),
    onSuccess: () => {
      router.back();
      queryClient.setQueryData<RecipeDto[]>(queryKeys.recipes, (list) => list?.filter((r) => r.id !== recipeId));
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes, exact: true });
    },
    onError,
  });
  const confirmDelete = () =>
    Alert.alert(`Удалить «${recipeName}»?`, undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const pick = useCallback((p: ProductDto) => {
    const item = newIngredient(p.id);
    setValue((v) => ({ ...v, items: [...v.items, item] }));
    setFocusKey(item.key);
    setPicking(false);
  }, []);
  const closePicker = useCallback(() => setPicking(false), []);

  const busy = save.isPending || reset.isPending || remove.isPending;
  const [showOriginal, setShowOriginal] = useState(false);
  const { toggleFavorite, setHidden } = useRecipeFlags();

  if (picking) return <ProductPicker products={products} onPick={pick} onClose={closePicker} />;

  const badge = recipe?.original ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Изменён. Показать стандартный рецепт"
      accessibilityState={{ expanded: showOriginal }}
      hitSlop={8}
      onPress={() => setShowOriginal((v) => !v)}
      style={({ pressed }) => [styles.badge, styles.badgeModified, pressed && styles.pressed]}>
      <MaterialCommunityIcons name="history" size={14} color={colors.warn} />
      <Text style={styles.badgeText} color={colors.warn}>изменён</Text>
    </Pressable>
  ) : recipe?.source === 'own' ? (
    <View style={[styles.badge, styles.badgeOwn]}>
      <Text style={styles.badgeText} color={colors.primaryDark}>свой</Text>
    </View>
  ) : null;

  const actions = recipe ? (
    <View style={styles.actions}>
      {badge}
      <IconButton
        icon="pot-steam-outline"
        variant="plain"
        color={colors.primaryDark}
        label="Приготовить"
        onPress={() => router.push({ pathname: '/cooking/[id]', params: { id: 'new', recipe: recipe.id } })}
      />
      <IconButton
        icon={recipe.favorite ? 'heart' : 'heart-outline'}
        variant="plain"
        color={recipe.favorite ? colors.danger : colors.textMuted}
        label={recipe.favorite ? 'Убрать из избранного' : 'В избранное'}
        accessibilityState={{ selected: recipe.favorite }}
        onPress={() => toggleFavorite(recipe)}
      />
      {recipe.source === 'own' ? (
        <IconButton icon="trash-can-outline" variant="plain" color={colors.textMuted} label="Удалить" disabled={busy} onPress={confirmDelete} />
      ) : recipe.hidden ? (
        <IconButton icon="eye-outline" variant="plain" label="Вернуть из скрытых" onPress={() => setHidden(recipe, false)} />
      ) : (
        <IconButton
          icon="eye-off-outline"
          variant="plain"
          color={colors.textMuted}
          label="Скрыть"
          onPress={() => {
            setHidden(recipe, true);
            router.back();
          }}
        />
      )}
    </View>
  ) : null;

  return (
    <Screen
      title={recipe ? 'Рецепт' : 'Новый рецепт'}
      onBack={() => router.back()}
      actions={actions}
      footer={
        <StickyFooter>
          <Button title="Сохранить" large disabled={!data || busy} onPress={() => data && save.mutate(data)} />
        </StickyFooter>
      }>
      {showOriginal && recipe?.original ? (
        <Card style={styles.info}>
          <Text variant="bodyStrong">{recipe.original.name}</Text>
          <Text variant="caption">{ingredientsLine(recipe.original.items, byId)}</Text>
          <Button title="Вернуть стандартный" variant="soft" disabled={busy} onPress={confirmReset} />
        </Card>
      ) : null}

      <RecipeForm
        value={value}
        onChange={setValue}
        products={byId}
        onAddProduct={() => setPicking(true)}
        focusKey={focusKey}
      />
    </Screen>
  );
}

export default function RecipeEditScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const isNew = id === NEW;

  const recipe = useQuery({
    queryKey: [...queryKeys.recipes, id],
    queryFn: () => api.recipe(id),
    enabled: !isNew,
    initialData: () => queryClient.getQueryData<RecipeDto[]>(queryKeys.recipes)?.find((r) => r.id === id),
  });
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });

  if ((!isNew && recipe.isPending) || products.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (products.isError) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => products.refetch()}
      />
    );
  }
  if (isNew) return <Editor recipe={null} initial={blankDraft(name ?? '')} products={products.data} />;
  if (recipe.isError || !recipe.data) {
    return (
      <StateMessage
        icon="book-off-outline"
        title="Рецепт не найден"
        text={familyErrorMessage(recipe.error)}
        actionTitle="Назад"
        onAction={() => router.back()}
      />
    );
  }
  return (
    <Editor
      key={recipe.data.id}
      recipe={recipe.data}
      initial={toDraft(recipeData(recipe.data))}
      products={products.data}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  info: { gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    marginRight: spacing.sm,
  },
  badgeModified: { backgroundColor: colors.warnSoft },
  badgeOwn: { backgroundColor: colors.primarySoft },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 12 },
  pressed: { opacity: 0.7 },
});
