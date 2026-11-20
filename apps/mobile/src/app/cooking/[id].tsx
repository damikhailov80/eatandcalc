import { todayISO, type CookingData, type CookingDto, type ProductDto, type RecipeDto } from '@eatandcalc/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import {
  CookingForm,
  fromCookingDraft,
  toCookingDraft,
  toRowDraft,
  type CookingDraft,
} from '@/components/cooking/CookingForm';
import { familyErrorMessage } from '@/components/family/errors';
import { LoadError } from '@/components/LoadError';
import { ProductPicker } from '@/components/recipes/ProductPicker';
import { Button, IconButton, Screen, StateMessage, StickyFooter } from '@/components/ui';
import { api } from '@/lib/api';
import { copyOfSession, rowsFromRecipe, snapshotOf } from '@/lib/cooking';
import { queryClient, queryKeys } from '@/lib/query';
import { productsById, type ProductsById } from '@/lib/recipes';
import { colors } from '@/theme';

const NEW = 'new';

const sessionData = ({ id: _id, createdAt: _createdAt, ...data }: CookingDto): CookingData => data;

/** A new pot: from a recipe ×1 (products as they are now) or blank, cooked today. */
function newDraft(recipe: RecipeDto | undefined, products: ProductsById): CookingDraft {
  return toCookingDraft({
    name: recipe?.name ?? '',
    date: todayISO(),
    recipeId: recipe?.id ?? null,
    recipeScale: recipe ? 1 : null,
    copiedFromId: null,
    items: recipe ? rowsFromRecipe(recipe, products, 1) : [],
    potWeightG: null,
    grossWeightG: null,
  });
}

/** A copy of the session dated today; the editor replaces the current screen. */
const cookAgain = (from: string) => router.replace({ pathname: '/cooking/[id]', params: { id: NEW, from } });

function Editor({
  session,
  initial,
  products,
  recipes,
}: {
  session: CookingDto | null;
  initial: CookingDraft;
  products: readonly ProductDto[];
  recipes: readonly RecipeDto[];
}) {
  const [value, setValue] = useState(initial);
  const [picking, setPicking] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const byId = useMemo(() => productsById(products), [products]);
  const recipe = value.recipeId ? recipes.find((r) => r.id === value.recipeId) : undefined;
  const data = fromCookingDraft(value);

  const sessionId = session?.id;
  const sessionName = session?.name;
  const onError = (e: unknown) => Alert.alert('Не получилось', familyErrorMessage(e));
  const save = useMutation({
    mutationFn: (input: CookingData) => (sessionId ? api.updateCooking(sessionId, input) : api.createCooking(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cooking });
      router.back();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteCooking(sessionId ?? ''),
    onSuccess: () => {
      router.back();
      queryClient.setQueryData<CookingDto[]>(queryKeys.cooking, (list) => list?.filter((s) => s.id !== sessionId));
      queryClient.invalidateQueries({ queryKey: queryKeys.cooking, exact: true });
    },
    onError,
  });
  const confirmDelete = () =>
    Alert.alert(`Удалить «${sessionName}»?`, undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => remove.mutate() },
    ]);
  const busy = save.isPending || remove.isPending;

  const pick = useCallback((p: ProductDto) => {
    const row = toRowDraft(snapshotOf(p, 1, 'g'), '');
    setValue((v) => ({ ...v, items: [...v.items, row] }));
    setFocusKey(row.key);
    setPicking(false);
  }, []);
  const closePicker = useCallback(() => setPicking(false), []);

  if (picking) return <ProductPicker products={products} onPick={pick} onClose={closePicker} />;

  return (
    <Screen
      title={session ? 'Готовка' : 'Новая готовка'}
      onBack={() => router.back()}
      actions={
        session ? (
          <View style={styles.actions}>
            <IconButton
              icon="repeat"
              variant="plain"
              color={colors.primaryDark}
              label="Приготовить снова"
              disabled={busy}
              onPress={() => cookAgain(session.id)}
            />
            <IconButton
              icon="trash-can-outline"
              variant="plain"
              color={colors.textMuted}
              label="Удалить"
              disabled={busy}
              onPress={confirmDelete}
            />
          </View>
        ) : undefined
      }
      footer={
        <StickyFooter>
          <Button title="Сохранить" large disabled={!data || busy} onPress={() => data && save.mutate(data)} />
        </StickyFooter>
      }>
      <CookingForm
        value={value}
        onChange={setValue}
        recipe={recipe}
        products={byId}
        onAddProduct={() => setPicking(true)}
        focusKey={focusKey}
      />
    </Screen>
  );
}

export default function CookingEditScreen() {
  const { id, recipe: recipeId, from } = useLocalSearchParams<{ id: string; recipe?: string; from?: string }>();
  const isNew = id === NEW;
  const listed = (sessionId: string) =>
    queryClient.getQueryData<CookingDto[]>(queryKeys.cooking)?.find((s) => s.id === sessionId);

  const session = useQuery({
    queryKey: [...queryKeys.cooking, id],
    queryFn: () => api.cooking(id),
    enabled: !isNew,
    initialData: () => listed(id),
  });
  // "Приготовить снова": the session the new one copies.
  const origin = useQuery({
    queryKey: [...queryKeys.cooking, from],
    queryFn: () => api.cooking(from ?? ''),
    enabled: isNew && !!from,
    initialData: () => (from ? listed(from) : undefined),
  });
  const products = useQuery({ queryKey: queryKeys.products, queryFn: api.products });
  const recipes = useQuery({ queryKey: queryKeys.recipes, queryFn: api.recipes });

  if ((!isNew && session.isPending) || (isNew && from && origin.isPending) || products.isPending || recipes.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (products.isError || recipes.isError) {
    return (
      <StateMessage
        icon="wifi-off"
        title="Нет связи с сервером"
        text="Приложение работает только онлайн. Проверьте интернет."
        actionTitle="Повторить"
        onAction={() => {
          if (products.isError) products.refetch();
          if (recipes.isError) recipes.refetch();
        }}
      />
    );
  }
  if (isNew && from) {
    if (origin.isError || !origin.data) {
      return (
        <LoadError
          error={origin.error}
          onRetry={() => origin.refetch()}
          notFound={{ icon: 'pot-steam-outline', title: 'Готовка не найдена' }}
        />
      );
    }
    return (
      <Editor
        key={`from-${origin.data.id}`}
        session={null}
        initial={toCookingDraft(copyOfSession(origin.data))}
        products={products.data}
        recipes={recipes.data}
      />
    );
  }
  if (isNew) {
    const recipe = recipeId ? recipes.data.find((r) => r.id === recipeId) : undefined;
    return (
      <Editor
        session={null}
        initial={newDraft(recipe, productsById(products.data))}
        products={products.data}
        recipes={recipes.data}
      />
    );
  }
  if (session.isError || !session.data) {
    return (
      <LoadError
        error={session.error}
        onRetry={() => session.refetch()}
        notFound={{ icon: 'pot-steam-outline', title: 'Готовка не найдена' }}
      />
    );
  }
  return (
    <Editor
      key={session.data.id}
      session={session.data}
      initial={toCookingDraft(sessionData(session.data))}
      products={products.data}
      recipes={recipes.data}
    />
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
