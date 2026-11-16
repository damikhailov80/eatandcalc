import { Card } from './Card';
import { Text } from './Text';

/** Temporary content for screens that are not built yet. */
export function Placeholder({ text }: { text: string }) {
  return (
    <Card style={{ gap: 6 }}>
      <Text variant="h3">В разработке</Text>
      <Text variant="caption">{text}</Text>
    </Card>
  );
}
