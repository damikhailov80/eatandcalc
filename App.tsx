import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { RootTabParamList } from './types/navigation';
import { store, persistor } from './store';

import HomeScreen from './screens/HomeScreen';
import IngredientsScreen from './screens/IngredientsScreen';
import RecipesScreen from './screens/RecipesScreen';
import CookingScreen from './screens/CookingScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Tab.Navigator
              initialRouteName="Ingredients"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#6200ee',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                tabBarActiveTintColor: '#6200ee',
                tabBarInactiveTintColor: '#999',
              }}
            >
              <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                  title: 'Home',
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="home" color={color} size={size} />
                  ),
                }}
              />
              <Tab.Screen
                name="Ingredients"
                component={IngredientsScreen}
                options={{
                  title: 'Ingredients',
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="food-apple" color={color} size={size} />
                  ),
                }}
              />
              <Tab.Screen
                name="Recipes"
                component={RecipesScreen}
                options={{
                  title: 'Recipes',
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="book-open-variant" color={color} size={size} />
                  ),
                }}
              />
              <Tab.Screen
                name="Cooking"
                component={CookingScreen}
                options={{
                  title: 'Cooking',
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons name="chef-hat" color={color} size={size} />
                  ),
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </PersistGate>
    </Provider>
  );
}
