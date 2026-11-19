import { Placeholder, Screen } from '@/components/ui';
import { refreshAll } from '@/lib/query';

export default function RecipesScreen() {
  return (
    <Screen onRefresh={refreshAll} title="Рецепты">
      <Placeholder text="Шаблоны состава блюд: ингредиенты, вес, порции и пищевая ценность." />
    </Screen>
  );
}
