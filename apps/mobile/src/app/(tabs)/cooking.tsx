import { Placeholder, Screen } from '@/components/ui';
import { refreshAll } from '@/lib/query';

export default function CookingScreen() {
  return (
    <Screen onRefresh={refreshAll} title="Готовка">
      <Placeholder text="История готовки: конкретные блюда по датам, остатки, повтор и копирование." />
    </Screen>
  );
}
