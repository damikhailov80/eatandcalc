import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Searchbar, IconButton } from 'react-native-paper';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { RootTabParamList } from '../types/navigation';
import { ConnectedIngredientCard, IngredientCategoryFilter } from '../components/index';
import { INGRIDIENTS_DATABASE } from '../data/Ingridients';
import { Ingridient } from '../types/ingridient';
import { selectShowOnlyFavorites, selectFavoriteIds, toggleShowOnlyFavorites } from '../store/slices/ingredientsSlice';

type Props = BottomTabScreenProps<RootTabParamList, 'Ingredients'>;

export default function IngredientsScreen({ navigation }: Props) {
  const dispatch = useDispatch();
  const showOnlyFavorites = useSelector(selectShowOnlyFavorites);
  const favoriteIds = useSelector(selectFavoriteIds);
  
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredIngredients = useMemo(() => {
    let ingredients = INGRIDIENTS_DATABASE;

    // Фильтрация по избранным
    if (showOnlyFavorites) {
      ingredients = ingredients.filter(ingredient =>
        favoriteIds.includes(ingredient.id)
      );
    }

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
  }, [searchQuery, selectedCategory, showOnlyFavorites, favoriteIds]);

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
        <IconButton
          icon={showOnlyFavorites ? 'heart' : 'heart-outline'}
          size={24}
          iconColor={showOnlyFavorites ? '#e91e63' : '#666'}
          onPress={() => dispatch(toggleShowOnlyFavorites())}
          style={styles.favoriteButton}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    elevation: 0,
    flex: 1,
  },
  favoriteButton: {
    margin: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 8,
  }
});
