import { useLocalSearchParams } from 'expo-router';

import { JoinFamily } from '@/components/family/JoinFamily';

/** Deep link target: `eatandcalc://join/<code>` (opened from the `<API>/invite/<code>` page). */
export default function JoinByLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <JoinFamily code={code} />;
}
