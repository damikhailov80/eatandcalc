import { StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme';
import { Text } from './Text';

export type MemberAvatarProps = {
  name: string;
  color: string;
  size?: number;
};

/** Colored circle with the first letter of the name. */
export function MemberAvatar({ name, color, size = 44 }: MemberAvatarProps) {
  const initial = name.trim().slice(0, 1).toUpperCase() || '?';
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text
        style={{
          color: colors.onPrimary,
          fontFamily: size >= 56 ? fonts.headingHeavy : fonts.bodyBold,
          fontSize: Math.round(size * 0.4),
        }}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
