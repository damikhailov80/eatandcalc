import { useLocalSearchParams } from 'expo-router';

import { JoinFamily } from '@/components/family/JoinFamily';

/** Join by a typed or scanned invite code (Семья → Аккаунты → «Ввести код» / «Сканировать QR-код», `?scan=1`). */
export default function JoinByCodeScreen() {
  const { scan } = useLocalSearchParams<{ scan?: string }>();
  return <JoinFamily scan={scan === '1'} />;
}
