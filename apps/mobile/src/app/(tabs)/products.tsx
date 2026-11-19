import { Placeholder, Screen } from '@/components/ui';
import { refreshAll } from '@/lib/query';

export default function ProductsScreen() {
  return (
    <Screen onRefresh={refreshAll} title="Продукты">
      <Placeholder text="База продуктов с КБЖУ на 100 г, штуку, ложку или свою единицу." />
    </Screen>
  );
}
