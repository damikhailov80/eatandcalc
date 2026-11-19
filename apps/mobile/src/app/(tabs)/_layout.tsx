import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { useHouseholdSync } from '@/lib/sync';
import { colors, fonts, radii } from '@/theme';

const PILL_WIDTH = 56;
const PILL_HEIGHT = 30;

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <MaterialCommunityIcons name={name} size={22} color={color as string} />
    </View>
  );
}

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <TabIcon name={icon} color={color} focused={focused} />
  ),
});

export default function TabsLayout() {
  useHouseholdSync();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodySemibold, fontSize: 11 },
        // The default icon box is 24 pt wide; the pill needs room or the icon is measured to zero width.
        tabBarIconStyle: { width: PILL_WIDTH, height: PILL_HEIGHT },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={tab('День', 'calendar-blank-outline')} />
      <Tabs.Screen name="cooking" options={tab('Готовка', 'pot-steam-outline')} />
      <Tabs.Screen name="recipes" options={tab('Рецепты', 'notebook-outline')} />
      <Tabs.Screen name="products" options={tab('Продукты', 'food-apple-outline')} />
      <Tabs.Screen name="family" options={tab('Семья', 'account-group-outline')} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  pillActive: { backgroundColor: colors.primarySoft },
});
