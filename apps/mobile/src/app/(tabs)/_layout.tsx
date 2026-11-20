import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TopTabs, type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useCallback, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { SwipeLockContext } from '@/lib/swipeLock';
import { useHouseholdSync } from '@/lib/sync';
import { colors, fonts, radii } from '@/theme';

const PILL_WIDTH = 56;
const PILL_HEIGHT = 30;

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, IconName> = {
  index: 'calendar-blank-outline',
  cooking: 'pot-steam-outline',
  recipes: 'notebook-outline',
  products: 'food-apple-outline',
  fastfood: 'hamburger',
  family: 'account-group-outline',
};

/**
 * Bottom bar for the pager-based tabs (TopTabs placed at the bottom), styled like the
 * previous bottom tabs: icon in a pill + label.
 */
function TabBar({ state, descriptors, emitter, navigateToTab, insets }: MaterialTopTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const color = focused ? colors.primaryDark : colors.textMuted;
        const title = descriptors[route.key]?.options.title ?? route.name;
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={title}
            style={styles.tab}>
            <View style={[styles.pill, focused && styles.pillActive]}>
              <MaterialCommunityIcons name={ICONS[route.name] ?? 'circle-outline'} size={22} color={color} />
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  useHouseholdSync();
  // Off while a finger is on a chip row (useSwipeLock), so the row scrolls instead of the tabs.
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const lockSwipe = useCallback((locked: boolean) => setSwipeEnabled(!locked), []);
  return (
    <SwipeLockContext value={lockSwipe}>
      <TopTabs
        tabBarPosition="bottom"
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ sceneStyle: { backgroundColor: colors.bg }, swipeEnabled }}>
        <TopTabs.Screen name="index" options={{ title: 'День' }} />
        <TopTabs.Screen name="cooking" options={{ title: 'Готовка' }} />
        <TopTabs.Screen name="recipes" options={{ title: 'Рецепты' }} />
        <TopTabs.Screen name="products" options={{ title: 'Продукты' }} />
        <TopTabs.Screen name="fastfood" options={{ title: 'Фастфуд' }} />
        <TopTabs.Screen name="family" options={{ title: 'Семья' }} />
      </TopTabs>
    </SwipeLockContext>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  pill: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  pillActive: { backgroundColor: colors.primarySoft },
  label: { fontFamily: fonts.bodySemibold, fontSize: 11 },
});
