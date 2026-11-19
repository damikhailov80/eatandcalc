import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
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
  // Taps go to the Pressable; the pan responder takes over only once the finger actually moves.
  const [responder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 8,
      onPanResponderGrant: () => offset.extractOffset(),
      onPanResponderMove: Animated.event([null, { dx: offset.x, dy: offset.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => offset.flattenOffset(),
      onPanResponderTerminate: () => offset.flattenOffset(),
    }),
  );

  if (!DEV_LOG_ENABLED || pathname === '/diagnostics') return null;
  const problems = unseenProblems(diagnostics);

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[styles.wrap, { top: insets.top + 4, transform: offset.getTranslateTransform() }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Журнал"
        hitSlop={8}
        onPress={() => router.push('/diagnostics')}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="bug-outline" size={22} color={colors.onPrimary} />
      </Pressable>
      {problems > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{problems > 99 ? '99+' : problems}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Above native-stack screens on Android (they draw with elevation).
  wrap: { position: 'absolute', right: 4, zIndex: 1000, elevation: 1000 },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.primaryDark,
    opacity: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 1 },
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
