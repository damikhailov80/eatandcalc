import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../types/navigation';
import { ConnectedIngredientCard, IngredientCategoryFilter } from '../components/index';
import { INGRIDIENTS_DATABASE } from '../data/Ingridients';
import { Ingridient } from '../types/ingridient';

type Props = BottomTabScreenProps<RootTabParamList, 'Ingredients'>;

export default function IngredientsScreen({ navigation }: Props) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredIngredients = useMemo(() => {
    let ingredients = INGRIDIENTS_DATABASE;

    // Фильтрация по категории
    if (selectedCategory !== 'ALL') {
      ingredients = ingredients.filter(ingredient =>
        ingredient.category === selectedCategory
      );
    }

    // Фильтрация по поисковому запросу
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      ingredients = ingredients.filter(ingredient =>
        ingredient.name.toLowerCase().includes(lowerQuery)
      );
    }

    return ingredients.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [searchQuery, selectedCategory]);

  const handleCardPress = (id: string) => {
    setActiveCardId(activeCardId === id ? null : id);
  };

  const handlePressOutside = () => {
    setActiveCardId(null);
  };

  const handleEdit = (id: string) => {
    console.log('Edit ingredient:', id);
    // TODO: Добавить логику редактирования
  };

  const handleDelete = (id: string) => {
    console.log('Delete ingredient:', id);
    // TODO: Добавить логику удаления
  };

  const renderItem = ({ item }: { item: Ingridient }) => (
    <ConnectedIngredientCard
      ingredient={item}
      isActive={activeCardId === item.id}
      onPress={() => handleCardPress(item.id)}
      onEdit={() => handleEdit(item.id)}
      onDelete={() => handleDelete(item.id)}
    />
  );

  return (
    <Pressable style={styles.container} onPress={handlePressOutside}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Поиск ингредиента"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
        />
      </View>
      <IngredientCategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <FlatList
        data={filteredIngredients}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 8,
    backgroundColor: '#fff',
  },
  searchBar: {
    elevation: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 8,
  },
});
