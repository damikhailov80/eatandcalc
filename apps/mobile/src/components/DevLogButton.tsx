import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { DEV_LOG_ENABLED, unseenProblems, useDiagnostics } from '@/lib/diagnostics';
import { colors, fonts, touch } from '@/theme';

const SIZE = touch;

/**
 * Floating «Журнал» button over every screen (temporary debug tool, off with EXPO_PUBLIC_DEV_LOG=0).
 * Drag it out of the way; tap opens the log. The red badge counts new warnings/errors.
 */
export function DevLogButton() {
  const pathname = usePathname();
  const diagnostics = useDiagnostics();
  const insets = useSafeAreaInsets();
  const [offset] = useState(() => new Animated.ValueXY());
  // Drag moves the button; a release without movement is a tap.
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_e, g) => {
        offset.flattenOffset();
        if (Math.abs(g.dx) + Math.abs(g.dy) <= 6) router.push('/diagnostics');
      },
      onPanResponderGrant: () => offset.extractOffset(),
      onPanResponderMove: Animated.event([null, { dx: offset.x, dy: offset.y }], { useNativeDriver: false }),
    }),
  );

  if (!DEV_LOG_ENABLED || pathname === '/diagnostics') return null;
  const problems = unseenProblems(diagnostics);

  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel="Журнал"
      style={[
        styles.button,
        { top: insets.top + 120, transform: offset.getTranslateTransform() },
      ]}>
      <MaterialCommunityIcons name="bug-outline" size={22} color={colors.onPrimary} />
      {problems > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{problems > 99 ? '99+' : problems}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 8,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.primaryDark,
    opacity: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.over,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onPrimary, fontFamily: fonts.bodyBold, fontSize: 11 },
});
