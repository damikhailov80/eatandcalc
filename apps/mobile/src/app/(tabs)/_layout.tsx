import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { useHouseholdSync } from '@/lib/sync';
import { colors, fonts, radii } from '@/theme';

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
  pill: { paddingHorizontal: 16, paddingVertical: 3, borderRadius: radii.pill },
  pillActive: { backgroundColor: colors.primarySoft },
});
